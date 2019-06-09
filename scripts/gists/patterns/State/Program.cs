using System;
using System.Collections.Generic;
using System.Linq;
using State;

public class Program {
    public static void Main () {
        var ctx = new StateClient ();
        ctx.State = new StateOne (ctx);
        Assert.Equal ("StateOne", ctx.State.GetType ().Name);
        //Threshold is reached, lets change to StateTwo
        ctx.Process ();
        Assert.Equal ("StateTwo", ctx.State.GetType ().Name);
        ctx.Process ();
        ctx.Process ();
        //Threshold is reached, lets change to StateTwo.
        //Once again, rules could be defined within state (e.g. different value for threshold or something like that)
        Assert.Equal ("StateOne", ctx.State.GetType ().Name);
        TestRunner.Print ();
    }
}
