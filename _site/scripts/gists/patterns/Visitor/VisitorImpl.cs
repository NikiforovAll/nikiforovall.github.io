namespace Visitor {
    public interface ILogEntryVisitor {
        void Visit (ExceptionLogEntry logEntry);
        void Visit (SimpleLogEntry logEntry);
    }
}
namespace Visitor {
    public class LogEntryVisitor : ILogEntryVisitor {
        public string State { get; set; }
        public void ProcessLogEntry (LogEntry logEntry) {
            logEntry.Accept (this);
        }
        void ILogEntryVisitor.Visit (ExceptionLogEntry exceptionLogEntry) {
            State = $"LogEntryVisitor[{nameof(exceptionLogEntry)}]";
        }
        void ILogEntryVisitor.Visit (SimpleLogEntry simpleLogEntry) {
            State = $"LogEntryVisitor[{nameof(simpleLogEntry)}]";
        }
    }
}

namespace Visitor {
    public class ExceptionLogEntry : LogEntry {
        public ExceptionLogEntry (LogEntry log) : base (log) { }

        public int ExceptionCode { get; set; }

        public override void Accept (ILogEntryVisitor visitor) {
            visitor.Visit (this);
        }
    }
}

namespace Visitor {
    public abstract class LogEntry {
        public DateTime Created { get; set; }
        public String Message { get; set; }

        public LogEntry (LogEntry log) {
            log.CopyTo (this);
        }

        public LogEntry () { }

        public abstract void Accept (ILogEntryVisitor visitor);

        public void CopyTo (LogEntry log) {
            log.Created = this.Created;
            log.Message = this.Message;
        }
    }
}

namespace Visitor {
    public class SimpleLogEntry : LogEntry {
        public SimpleLogEntry () { }

        public SimpleLogEntry (LogEntry log) : base (log) { }
        public string AdditionalInfo { get; set; }

        public override void Accept (ILogEntryVisitor visitor) {
            visitor.Visit (this);
        }
    }
}
