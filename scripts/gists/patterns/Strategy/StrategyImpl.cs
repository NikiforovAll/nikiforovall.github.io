using System;
using System.Collections.Generic;


namespace Strategy {
    public interface ILogReader {
        List<LogEntry> Read ();
    }
}

namespace Strategy {
    public class LogEntry {
        public DateTime DateTime { get; set; }
        public string Message { get; set; }
    }
}
namespace Strategy {
    public class LogFileReader : ILogReader {
        public List<LogEntry> Read () {
            return new List<LogEntry> {
                new LogEntry { Message = "LogFileReader.m1" },
                new LogEntry { Message = "LogFileReader.m2" }
            };
        }
    }
}

namespace Strategy {
    public class LogProcessor {
        private ILogReader _logReader { get; set; }

        //context, client of strategy
        public static void ProcessLogs () {

        }
    }
}

namespace Strategy {
    public class WindowsEventLogReader : ILogReader {
        public List<LogEntry> Read () {
            return new List<LogEntry> {
                new LogEntry { Message = "WindowsEventLogReader.m1" }
            };
        }
    }
}
