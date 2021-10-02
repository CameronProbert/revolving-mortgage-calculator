jQuery($ => {

    function addListener(selector) {
        const el = $(selector)
        el.on('change', doCalc)

        // Connect to session storage
        el.on('input', (e) => {
            sessionStorage.setItem(selector, e.target.value)
        })
        el.val(sessionStorage.getItem(selector))

        return el
    }

    const housePriceInput = addListener('#housePrice')
    const depositAmountInput = addListener('#depositAmount')
    const termMortgageInterestInput = addListener('#termMortgageInterest')
    const termMortgageRepaymentsInput = addListener('#termMortgageRepayments')

    const revolvingMortgageTotalInput = addListener('#revolvingMortgageTotal')
    const revolvingMortgageInterestInput = addListener('#revolvingMortgageInterest')
    const incomeInput = addListener('#revolvingMortgageIncome')

    const weeklyExpensesInput = addListener('#weeklyExpenses')
    const fortnightlyExpensesInput = addListener('#fortnightlyExpenses')
    const monthlyExpensesInput = addListener('#monthlyExpenses')
    const yearlyExpensesInput = addListener('#yearlyExpenses')

    const useCreditCardInput = addListener('#useCreditCard')

    const totalMortgageEl = $('#totalMortgage')
    const totalPaidEl = $('#totalPaid')
    const yearsToPayEl = $('#yearsToPay')
    const totalRemainingEl = $('#totalRemaining')
    const totalRemainingRevolvingBalanceEl = $('#totalRemainingRevolvingBalance')

    $.fn.nval = function() {
        return Number(this.val()) || 0
    }

    function doCalc() {
        try {
            const housePrice = housePriceInput.nval()
            const depositAmount = depositAmountInput.nval()
            const mortgageTotal = housePrice - depositAmount

            const termMortgageInterest = termMortgageInterestInput.nval() / 100
            const termMortgageRepayments = termMortgageRepaymentsInput.nval()
            const maxYearsToCalculate = 50

            const revolvingMortgageTotal = revolvingMortgageTotalInput.nval()
            const revolvingMortgageInterest = revolvingMortgageInterestInput.nval() / 100
            const income = incomeInput.nval()

            const termMortgageTotal = mortgageTotal - revolvingMortgageTotal

            const weeklyExpenses = weeklyExpensesInput.nval()
            const fortnightlyExpenses = fortnightlyExpensesInput.nval()
            const monthlyExpenses = monthlyExpensesInput.nval()
            const yearlyExpenses = yearlyExpensesInput.nval()

            const useCreditCard = useCreditCardInput.is(":checked")

            const today = new Date()
            const endOfTerm = dateFns.addYears(today, maxYearsToCalculate)

            let dateIndex = today
            let balanceRevolving = revolvingMortgageTotal
            let owingOnTerm = termMortgageTotal
            let numDaysSinceStart = 0
            let monthlyInterestArrearsRevolving = 0
            let monthlyInterestArrearsTerm = 0
            let totalPaid = 0

            let owingOnCreditCard = 0

            function payCreditCardBalance() {
                balanceRevolving -= owingOnCreditCard
                owingOnCreditCard = 0
            }

            function interestOnRevolving() {
                return dayInterest(
                    Math.max(revolvingMortgageTotal - balanceRevolving, 0),
                    dateIndex,
                    revolvingMortgageInterest
                )
            }

            function interestOnTerm() {
                return dayInterest(
                    owingOnTerm,
                    dateIndex,
                    termMortgageInterest
                )
            }

            function calculateInterestToArrears() {
                monthlyInterestArrearsTerm += interestOnTerm()
                monthlyInterestArrearsRevolving += interestOnRevolving()
            }

            function addArrears() {
                owingOnTerm += monthlyInterestArrearsTerm
                balanceRevolving -= monthlyInterestArrearsRevolving
                monthlyInterestArrearsTerm = 0
                monthlyInterestArrearsRevolving = 0
            }

            function payFromRevolvingToTerm(amount) {
                owingOnTerm -= amount
                balanceRevolving -= amount
                totalPaid += amount
            }

            function addIncome() {
                balanceRevolving += income
            }

            function payWeeklyExpenses() {
                if (useCreditCard) {
                    owingOnCreditCard += weeklyExpenses
                } else {
                    balanceRevolving -= weeklyExpenses
                }
            }

            function payFortnightlyExpenses() {
                if (useCreditCard) {
                    owingOnCreditCard += fortnightlyExpenses
                } else {
                    balanceRevolving -= fortnightlyExpenses
                }
            }

            function payMonthlyExpenses() {
                if (useCreditCard) {
                    owingOnCreditCard += monthlyExpenses
                } else {
                    balanceRevolving -= monthlyExpenses
                }
            }

            function payYearlyExpenses() {
                if (useCreditCard) {
                    owingOnCreditCard += yearlyExpenses
                } else {
                    balanceRevolving -= yearlyExpenses
                }
            }

            function printInfo() {
                console.clear()
                const dateString = dateFns.format(dateIndex, "YY MMM DD")
                console.groupCollapsed(dateString)
                console.log(`Term Balance: ${owingOnTerm}`)
                console.log(`Revolving Balance: ${balanceRevolving}`)
                console.groupEnd(dateString)
            }

            while (dateFns.isBefore(dateIndex, endOfTerm)) {
                const nextDay = dateFns.addDays(dateIndex, 1)
                calculateInterestToArrears()
                const isWeek = numDaysSinceStart % 7 === 0
                if (isWeek) {
                    payWeeklyExpenses()
                }
                const isFortnight = numDaysSinceStart % 14 === 0
                if (isFortnight) {
                    payFortnightlyExpenses()
                    payFromRevolvingToTerm(termMortgageRepayments)
                }

                if (dateFns.isFirstDayOfMonth(dateIndex)) {
                    addIncome()
                    payMonthlyExpenses()
                }
                if (dateFns.format(dateIndex, "MM DD") === "07 01") {
                    payYearlyExpenses()
                }
                if (dateFns.isLastDayOfMonth(dateIndex)) {
                    payCreditCardBalance()
                    addArrears()
                    printInfo()
                }

                if (owingOnTerm < 0) {
                    owingOnTerm = 0
                    break
                }

                dateIndex = nextDay
                numDaysSinceStart += 1
            }

            if (owingOnTerm === 0) {
                console.log("Completely paid by " + dateIndex)
                const years = dateFns.differenceInYears(dateIndex, today)
                const months = dateFns.differenceInMonths(dateIndex, today) % 12
                const days = dateFns.differenceInDays(dateIndex, today) % 365
                yearsToPayEl.text(`${years} years, ${months} months, ${days} days`)
            } else {
                console.log("Remaining to pay after mortgage length: " + owingOnTerm)
                yearsToPayEl.text("Not finished paying")
            }

            totalMortgageEl.text(round(termMortgageTotal))
            totalPaidEl.text(round(totalPaid))
            totalRemainingEl.text(round(owingOnTerm))
            totalRemainingRevolvingBalanceEl.text(round(balanceRevolving))
        } catch (e) {
            console.error(e)
        }
    }

    function dayInterest(amount, date, interest) {
        const daysInYear = date.getFullYear() % 4 === 0 ? 366 : 365
        return amount / daysInYear * interest
    }

    function round(num) {
        return Math.round(num * 100) / 100
    }

    doCalc()

})