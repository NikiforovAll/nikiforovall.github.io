using System;
using Observer;
using System.Collections.Generic;

public class Program
{
    public static void Main()
    {
            var subject = new ConcreteSubject();
            var observers = new[] { new ConcreteObserver(), new ConcreteObserver(), new ConcreteObserver() };
            foreach (var observer in observers)
            {
                subject.Attach(observer);
            }
            Assert.All(observers, (el => el.State == null));
            subject.SubjectState = "init";
            subject.Notify();
            Assert.All(observers, (el => "init".Equals(el.State)));
            subject.SubjectState = "changed";
            subject.Notify();
            Assert.All(observers, (el => "changed".Equals(el.State)));
            TestRunner.Print();
    }
}
