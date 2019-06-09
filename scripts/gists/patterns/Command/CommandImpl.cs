using System;
using System.Collections.Generic;

namespace Command {
    public class Calculator {
        private int _curr = 0;

        public int CurrentResult { get => _curr; set => _curr = value; }

        public int Operate (char @operator, int operand) {
            // possibility to use interpreter pattern
            switch (@operator) {
                case '+':
                    CurrentResult += operand;
                    break;
                case '-':
                    CurrentResult -= operand;
                    break;
                case '*':
                    CurrentResult *= operand;
                    break;
                case '/':
                    CurrentResult /= operand;
                    break;
            }

            return CurrentResult;
        }
    }
}

namespace Command {
    public class CalculatorClient {
        private Calculator calculator = new Calculator ();
        private Stack<Command> _commands = new Stack<Command> ();

        public int Result { get => calculator.CurrentResult; }

        public double Compute (char @operator, int operand) {
            var command = new CalculatorCommand (calculator, @operator, operand);
            _commands.Push (command);
            return command.Execute ();
        }

        public double Undo () {
            return _commands.Pop ().UnExecute ();
        }
    }
}

namespace Command {
    public class CalculatorCommand : Command {
        private readonly Calculator calculator;
        private readonly char @operator;
        private readonly int operand;

        public CalculatorCommand (Calculator calculator, char @operator, int operand) {
            this.calculator = calculator;
            this.@operator = @operator;
            this.operand = operand;
        }

        public override double Execute () {
            return calculator.Operate (@operator, operand);
        }

        public override double UnExecute () {
            return calculator.Operate (GetUndoOperator (@operator), operand);
        }

        private char GetUndoOperator (char @operator) {
            switch (@operator) {
                case '+':
                    return '-';
                case '-':
                    return '+';
                case '*':
                    return '/';
                case '/':
                    return '*';
                default:
                    throw new ArgumentException (nameof (@operator) + "is not found");
            }
        }
    }
}

namespace Command {
    public abstract class Command {
        public abstract double Execute ();
        public abstract double UnExecute ();
    }
}
