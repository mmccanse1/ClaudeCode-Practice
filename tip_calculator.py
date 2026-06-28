def calculate_tip(bill_amount, tip_percent):
    """Calculate the tip and total for a restaurant bill."""
    tip = bill_amount * (tip_percent / 100)
    total = bill_amount + tip
    return tip, total


def split_bill(total, num_people):
    """Split the total bill evenly among a number of people."""
    return total / num_people


def main():
    bill = float(input("Enter bill amount: $"))
    percent = float(input("Enter tip percentage: "))
    tip, total = calculate_tip(bill, percent)
    print(f"Tip:   ${tip:.2f}")
    print(f"Total: ${total:.2f}")

    split = input("Split the bill? (y/n): ").strip().lower()
    if split == "y":
        people = int(input("Number of people: "))
        per_person = split_bill(total, people)
        print(f"Each person pays: ${per_person:.2f}")


if __name__ == "__main__":
    main()
