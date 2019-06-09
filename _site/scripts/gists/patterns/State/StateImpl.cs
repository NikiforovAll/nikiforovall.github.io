using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Threading;

namespace State {
    public abstract class BaseState {
        public int Value { get; protected set; }
        public StateClient Client { get; set; }
        protected int Threshold { get; set; } = 1;

        public virtual bool IsNeedToChangeState () {
            return Value >= Threshold;
        }

        public virtual void Increment () {
            Value++;
            HandleContext ();
        }
        protected abstract void HandleContext ();

        public override string ToString () {
            return $"State={this.GetType().Name};Value={this.Value}";
        }
    }
}

namespace State {
    //client class, context
    public class StateClient : INotifyPropertyChanged {
        public event PropertyChangedEventHandler PropertyChanged;
        protected void OnPropertyChanged ([CallerMemberName] string propertyName = null) {
            PropertyChanged?.Invoke (this, new PropertyChangedEventArgs (propertyName));
        }

        private BaseState _state;
        public BaseState State {
            get { return _state; }
            set { SetField (ref _state, value); }
        }

        protected bool SetField<T> (ref T field, T value, [CallerMemberName] string propertyName = null) {
            if (EqualityComparer<T>.Default.Equals (field, value))
                return false;
            field = value;
            OnPropertyChanged (propertyName);
            return true;
        }

        public StateClient () {
            this.PropertyChanged += (sender, arg) => {
                System.Console.WriteLine ($"sender={sender};arg={arg.PropertyName}");
            };
        }

        public void Process () {
            _state.Increment ();
        }
    }
}

namespace State {
    public class StateOne : BaseState {

        public StateOne (StateClient client) {
            Client = client;
        }
        protected override void HandleContext () {
            if (base.IsNeedToChangeState ()) {
                Client.State = new StateTwo (this);
            }
        }
    }
}
namespace State {
    public class StateTwo : BaseState {
        public StateTwo (BaseState state) {
            Threshold = 3;
            Value = state.Value;
            Client = state.Client;
        }

        protected override void HandleContext () {
            if (base.IsNeedToChangeState ()) {
                Client.State = new StateOne (Client);
            }
        }
    }
}
