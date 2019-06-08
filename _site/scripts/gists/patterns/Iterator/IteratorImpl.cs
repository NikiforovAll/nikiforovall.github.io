using System;
using System.Collections;
using System.Collections.Generic;

namespace Iterator {
    public class ConcreteIterator<T> : Iterator.Iterator<T> {

        public ConcreteIterator (CustomCollection<T> collection) {
            _collection = collection;
        }

        public int Step { get; set; } = 2;
        private CustomCollection<T> _collection;

        private int _currentIndex;

        public override T CurrentItem () {
            return _collection[_currentIndex];
        }

        public override T First () {
            return _collection[0];

        }

        public override bool IsDone () {
            return _currentIndex > _collection.Count - 1;
        }

        public override T Next () {
            T result = default (T);
            if (!IsDone ()) {
                result = _collection[_currentIndex];
                _currentIndex += Step;
            }
            return result;
        }
    }
}
namespace Iterator {
    public class CustomCollection<T> : ICustomCollection<T>, IEnumerable<T> {
        private List<T> _values = new List<T> ();

        public T this [int index] {
            get => _values[index];
            set => _values[index] = value;
        }

        public int Count { get => _values.Count; }

        public Iterator<T> CreateIterator () {
            return new ConcreteIterator<T> (this);
        }

        public void Add (T item) {
            _values.Add (item);
        }
        //it is better approach to use IEnumerable interfaces to implement Iterator pattern for language support and compatability, although I tryied to stick to canonized version
        public IEnumerator<T> GetEnumerator () {
            return _values.GetEnumerator ();
        }

        IEnumerator IEnumerable.GetEnumerator () {
            return _values.GetEnumerator ();
        }
    }
}
namespace Iterator {
    public interface ICustomCollection<T> {
        Iterator.Iterator<T> CreateIterator ();

        T this [int index] {
            get;
            set;
        }
    }
}

namespace Iterator {
    public abstract class Iterator<T> {
        public abstract T First ();
        public abstract T Next ();

        public abstract bool IsDone ();

        public abstract T CurrentItem ();

    }
}
