using System;
using Strategy;
using System.Collections.Generic;

public class Program
{
    public static void Main()
    {
            ILogReader logReader;
            // log storage number one
            logReader = new LogFileReader();
            List<LogEntry> logEntryList1 = logReader.Read();
            Assert.Equal(2, logEntryList1.Count);
            Assert.Contains("LogFileReader", logEntryList1[0].Message);
            // log storage number two
            logReader = new WindowsEventLogReader();
            List<LogEntry> logEntryList2 = logReader.Read();
            Assert.Single(logEntryList2);
            Assert.Contains("WindowsEventLogReader", logEntryList2[0].Message);
            TestRunner.Print();
    }
}
