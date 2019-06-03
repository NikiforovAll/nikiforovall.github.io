using System;
using TemlateMethod;
using System.Collections.Generic;

public class Program
{
    public static void Main()
    {
        var items = new [] { 1, 2, 3, 4, 5 };
        AbstractClass processor = new ConcreteProcessor1();
        int result1 = processor.Process(items);
        Assert.Equal(24, result1);
        processor = new ConcreteProcessor2();
        int result2 = processor.Process(items);
        Assert.Equal(15, result2);
        TestRunner.Print();
    }
}
