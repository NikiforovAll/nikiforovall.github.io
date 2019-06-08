using System;
using System.Collections.Generic;
using System.Linq;
using Iterator;

public class Program {
    public static void Main () {
        var collection = new CustomCollection<int> { 1, 2, 3, 4, 5 };
        var iterator = collection.CreateIterator ();
        Assert.Equal (new int[] { 1, 3, 5 }, iterator.getCollectionFromIterator ().ToList ());
        TestRunner.Print ();
    }
}
public static class IteratorExtensions {
    public static IEnumerable<int> getCollectionFromIterator (this Iterator<int> iterator) {
        while (!iterator.IsDone ()) {
            yield return iterator.Next ();
        }
    }
}
