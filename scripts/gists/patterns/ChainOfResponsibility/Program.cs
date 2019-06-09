using System;
using System.Collections.Generic;
using System.Linq;
using ChainOfResponsibility;

public class Program {
    public static void Main () {
        List<Approver> approvers = new List<Approver> {
            new Director ("#1"),
            new VicePresident ("#2"),
            new President ("#3")
        };
        ChainOfResponsibilityManager manager = new ChainOfResponsibilityManager (
            new Dictionary<string, string> {
                ["#1"] = "#2",
                ["#2"] = "#3"
            }
        );
        var baseApprover = manager.CreateChainOfApprovers (approvers);

        Purchase purchase1 = (Purchase) (5.0, 1, "p1");
        Purchase purchase2 = (Purchase) (11.0, 1, "p1");
        Purchase purchase3 = (Purchase) (16.0, 1, "p1");
        Purchase purchase4 = (Purchase) (21.0, 1, "p1");

        var result1 = approvers[0].ProcessRequest (purchase1);
        Assert.Equal (ProcessingLevel.Accepted, result1.Item2);

        var result2 = approvers[0].ProcessRequest (purchase2);
        Assert.Equal (ProcessingLevel.EscalationLevelOne, result2.Item2);

        var result3 = approvers[0].ProcessRequest (purchase3);
        Assert.Equal (ProcessingLevel.EscalationLevelTwo, result3.Item2);

        var result4 = approvers[0].ProcessRequest (purchase4);
        Assert.Equal (false, result4.Item1);
        Assert.Equal (ProcessingLevel.Rejected, result4.Item2);
        TestRunner.Print ();
    }
}
