def calculate_tip(bill_amount, tip_percent):
    """Calculate the tip and total for a restaurant bill."""
    tip = bill_amount * (tip_percent / 100)
    total = bill_amount + tip
    return tip, total


def get_positive_float(prompt: str, allow_zero: bool = False) -> float:
    while True:
        try:
            value = float(input(prompt))
        except ValueError:
            print("Please enter a valid number.")
            continue
        if value < 0 or (not allow_zero and value == 0):
            print("Value must be greater than zero.")
            continue
        return value


def main():
    bill = get_positive_float("Enter bill amount: $")
    percent = get_positive_float("Enter tip percentage: ", allow_zero=True)
    tip, total = calculate_tip(bill, percent)
    print(f"Tip:   ${tip:.2f}")
    print(f"Total: ${total:.2f}")


if __name__ == "__main__":
    main()
