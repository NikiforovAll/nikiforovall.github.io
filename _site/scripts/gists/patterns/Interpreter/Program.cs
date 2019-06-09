using System;
using System.Collections.Generic;
using Interpreter;

public class Program
{
    public static void Main()
    {
            var context = new Context();
            context.TerminalExpressionArgs = new TerminalExpression[] {
                new TerminalExpression(1),
                new TerminalExpression(2)
            };

            AbstractInterpreter[] interpreters = new AbstractInterpreter[]{
                new TerminalExpression(3),
                new NonTerminalExpression(){BinaryOperation = (a, b)=>a*b}
            };
            Assert.Equal(6, interpreters[0].Interpret(context));
            Assert.Equal(8, interpreters[1].Interpret(context));

        TestRunner.Print();
    }
}
