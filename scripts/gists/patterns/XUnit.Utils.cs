using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;

public static class Assert {
    public static void Equal<T> (T a, T b, [CallerMemberName] string callerName = "", [CallerLineNumber] int callerLine = 0) {
        if (!a.Equals (b)) {
            // throw new Exception ($"{a} doesn't equal to {b}");
            TestRunner.AddResult (
                new TestRunResult () {
                    CallerName = callerName,
                        CallerLine = callerLine.ToString (),
                        Success = false,
                        Assertion = "Equal<T>",
                        ErrorMessage = $"{a} doesn't equal to {b}"
                });
        } else {
            TestRunner.AddResult (
                new TestRunResult () {
                    CallerName = callerName,
                        CallerLine = callerLine.ToString (),
                        Success = true,
                        Assertion = "Single<T>"
                });
        }
    }

    public static void Single<T> (IEnumerable<T> collection, [CallerMemberName] string callerName = "", [CallerLineNumber] int callerLine = 0) {
        if (collection.Count () != 1) {
            // throw new Exception ("Collection doesn't contain 1 element");
            TestRunner.AddResult (
                new TestRunResult () {
                    CallerName = callerName,
                        CallerLine = callerLine.ToString (),
                        Success = false,
                        Assertion = "Single<T>",
                        ErrorMessage = "Collection doesn't contain 1 element"
                });
        }
        TestRunner.AddResult (
            new TestRunResult () {
                CallerName = callerName,
                    CallerLine = callerLine.ToString (),
                    Success = true,
                    Assertion = "Single<T>"
            });
    }

    public static void Contains<T> (T token1, T token2, [CallerMemberName] string callerName = "", [CallerLineNumber] int callerLine = 0) {
        if (typeof (T) == typeof (System.String)) {
            if (!((token2 as string)).Contains (token1 as string)) {
                // throw new Exception ($"{token2} doesn't contain {token1}");
                TestRunner.AddResult (
                    new TestRunResult () {
                        CallerName = callerName,
                            CallerLine = callerLine.ToString (),
                            Success = false,
                            Assertion = "Contains<T>",
                            ErrorMessage = $"{token2} doesn't contain {token1}"
                    });
            } else {
                TestRunner.AddResult (
                    new TestRunResult () {
                        CallerName = callerName,
                            CallerLine = callerLine.ToString (),
                            Success = true,
                            Assertion = "Contains<T>"
                    });
            }
        } else {
            throw new Exception ("It is not possible to use .Contains() method");
        }
    }

}

public static class TestRunner {
    public static List<TestRunResult> Results { get; } = new List<TestRunResult> ();

    public static void AddResult (TestRunResult res) {
        Results.Add (res);
    }

    public static void Print () {
        System.Console.WriteLine ("TestRunner.Print");
        System.Console.WriteLine ("============================================");
        foreach (var log in Results) {
            System.Console.WriteLine (log);
        }
        System.Console.WriteLine ("============================================");
    }
}

public class TestRunResult {
    public string CallerName { get; set; }
    public string CallerLine { get; set; }
    public string Assertion { get; set; }
    public bool Success { get; set; }
    public string ErrorMessage { get; set; }
    public override string ToString () {
        return $"Assertion: {Assertion, 15}; MethodName: {CallerName, 10}; Line: {CallerLine, 3}; " + (Success? $"Success: {Success}": $"ErrorMessage: {ErrorMessage}");
    }
}
