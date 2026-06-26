import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';

const ASKED_KEY = '@meal_planner_notif_asked';
const IDS_KEY = '@meal_planner_notif_ids';
const ANDROID_CHANNEL = 'replan';

// How notifications behave when received while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Replan reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function getNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Whether we've already shown the in-app reminders ask (so we don't nag). */
export async function hasAskedNotificationPermission(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markNotificationAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(ASKED_KEY, 'true');
  } catch {
    // ignore
  }
}

async function getStoredIds(): Promise<Record<string, string>> {
  try {
    const json = await AsyncStorage.getItem(IDS_KEY);
    const parsed = json ? JSON.parse(json) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function setStoredId(dietType: DietType, id: string | null): Promise<void> {
  const ids = await getStoredIds();
  if (id) ids[dietType] = id;
  else delete ids[dietType];
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

/** Cancels the scheduled replan reminder for a diet, if one exists. */
export async function cancelReplanReminder(dietType: DietType): Promise<void> {
  const ids = await getStoredIds();
  const id = ids[dietType];
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // already gone
    }
    await setStoredId(dietType, null);
  }
}

/**
 * Schedules a single "time to replan" reminder for this diet, one day before
 * the 7-day plan expires. Replaces any existing reminder for the same diet.
 * Caller must ensure notification permission is granted first.
 */
export async function scheduleReplanReminder(dietType: DietType): Promise<void> {
  await ensureAndroidChannel();
  await cancelReplanReminder(dietType);

  const cfg = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];

  // Plans expire 7 days after creation → remind 6 days out, late afternoon.
  const triggerDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  triggerDate.setHours(17, 0, 0, 0);
  if (triggerDate.getTime() <= Date.now()) return;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Your ${cfg.label} plan expires tomorrow`,
      body: 'Scan this week’s receipt and get a fresh 7 recipes.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: ANDROID_CHANNEL,
    },
  });
  await setStoredId(dietType, id);
}
