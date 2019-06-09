using System;
using System.Collections.Generic;
using Command;

public class Program {
    public static void Main () {
        var operations = new List < (char @operator, int operand) > {
            ('+', 10),
            ('-', 5),
            ('*', 3)
        };
        CalculatorClient client = new CalculatorClient ();
        foreach (var operation in operations) {
            client.Compute (operation.@operator, operation.operand);
        }

        Assert.Equal (15, client.Result);
        client.Undo ();
        Assert.Equal (5, client.Result);

        TestRunner.Print();
    }
}
