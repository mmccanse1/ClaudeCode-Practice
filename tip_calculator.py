def calculate_tip(bill_amount, tip_percent):
    """Calculate the tip and total for a restaurant bill."""
    tip = bill_amount * (tip_percent / 100)
    total = bill_amount + tip
    return tip, total


def main():
    bill = float(input("Enter bill amount: $"))
    percent = float(input("Enter tip percentage: "))
    tip, total = calculate_tip(bill, percent)
    print(f"Tip:   ${tip:.2f}")
    print(f"Total: ${total:.2f}")


if __name__ == "__main__":
    main()
