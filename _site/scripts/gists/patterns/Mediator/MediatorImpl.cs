using System;
using System.Collections.Generic;

namespace Mediator {
    /// <summary>
    /// The 'Mediator' abstract class
    /// </summary>
    public abstract class AbstractChatroom {
        public abstract void Register (User user);
        public abstract void Send (string from, string to, string message);

    }
}
namespace Mediator {
    /// <summary>
    /// The 'ConcreteMediator' class
    /// </summary>
    public class Chatroom : AbstractChatroom {
        private Dictionary<string, User> _users = new Dictionary<string, User> ();
        public override void Register (User user) {
            if (!_users.ContainsValue (user)) {
                _users[user.Name] = user;
            }
            user.Chatroom = this;
        }

        public override void Send (string from, string to, string message) {
            User participant = _users[to];

            if (participant != null) {
                participant.Receive (from, message);
            } else {
                throw new KeyNotFoundException ("User not found");
            }
        }
    }
}

namespace Mediator {
    public class User {
        public User (string name) {
            Name = name;
        }
        public Chatroom Chatroom { get; set; }
        public string Name { get; }

        public Stack < (string source, string message) > MessageCache { get; private set; } = new Stack < (string source, string message) > ();

        // it is also possible to create interface for recipient aka 'AbstractColleague'
        public void Receive (string from, string message) {
            MessageCache.Push ((source: from, message: message));
        }
    }
}
