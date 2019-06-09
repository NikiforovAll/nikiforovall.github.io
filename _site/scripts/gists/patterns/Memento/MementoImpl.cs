using System;
using System.Collections.Generic;

namespace Memento {
    public class Caretaker : Stack<Memento> { }
}
namespace Memento {
    public class Memento {
        public (string Id, int balance) State { get; private set; }
        //probably better to use read-only state
        internal Memento () {}
        public Memento SetState ((string Id, int balance) state) {
            State = state;
            return this;
        }
    }
}

namespace Memento {
    public class Originator {
        public (string Id, int balance) State { get; set; }

        public Originator (string Id) {
            State = (Id, 0);
        }
        public Originator () {

        }
        public Memento CreateMemento () {
            return new Memento ()
                .SetState (State);
        }
        public void SetMemento (Memento memento) {
            this.State = memento.State;
        }
    }
}
