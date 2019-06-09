using System;

namespace Interpreter {
    public abstract class AbstractInterpreter {
        public abstract int Interpret (Context context);
    }
}

namespace Interpreter {
    public class Context {
        public TerminalExpression[] TerminalExpressionArgs { get; set; }

        public readonly int MULTIPLIER = 2;
    }
}

namespace Interpreter {
    public class NonTerminalExpression : AbstractInterpreter {
        public Func<int, int, int> BinaryOperation { get; set; } = (a, b) => 0;
        public override int Interpret (Context context) {
            if (context.TerminalExpressionArgs.Length < 2) {
                throw new ArgumentException ("should be at least 2 terminal params");
            }
            return BinaryOperation?.Invoke (context.TerminalExpressionArgs[0].Interpret (context), context.TerminalExpressionArgs[1].Interpret (context)) ?? 0;
        }
    }
}

namespace Interpreter {
    public class TerminalExpression : AbstractInterpreter {
        public int Value { get; set; } = 1;
        public TerminalExpression (int value) {
            Value = value;
        }

        public override int Interpret (Context context) {
            //although probably interpreter should not contain actual state to interpret
            return context.MULTIPLIER * Value;
        }
    }
}
