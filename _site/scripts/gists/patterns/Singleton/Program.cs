using System;
using Singleton;
using System.Collections.Generic;

public class Program
{
    public static void Main()
    {
            var s1 = Singleton.Instance;
            var s2 = Singleton.Instance;
            Assert.Equal(s1, s2);

            TestRunner.Print();
    }
}
