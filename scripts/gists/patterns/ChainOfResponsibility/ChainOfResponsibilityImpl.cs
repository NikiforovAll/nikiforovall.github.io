using System;
using System.Collections.Generic;
using System.Linq;

namespace ChainOfResponsibility {
    /// <summary>
    /// The 'Handler' abstract class
    /// </summary>
    public abstract class Approver {
        public string Id { get; }
        protected Approver successor;
        protected Approver (string id) {
            Id = id;
        }
        protected Approver () : this ("") { }

        public void SetSuccessor (Approver approver) {
            this.successor = approver;
        }

        public Approver GetSuccessor () => this.successor;
        public abstract (bool, ProcessingLevel) ProcessRequest (Purchase purchase);
    }
}

namespace ChainOfResponsibility {
    public class ChainOfResponsibilityManager {
        private Dictionary<string, string> relationshipConfig;

        public ChainOfResponsibilityManager (Dictionary<string, string> relationshipConfig) {
            this.relationshipConfig = relationshipConfig;
        }
        public Approver CreateChainOfApprovers (List<Approver> approvers) {
            var configValues = relationshipConfig.Values;
            Approver mainApprover = approvers.First (el => !configValues.Contains (el.Id, StringComparer.InvariantCultureIgnoreCase));

            foreach (var approver in approvers) {
                if (relationshipConfig.TryGetValue (approver.Id, out string currentApproverId)) {
                    var activeApprover = approvers.First (el => el.Id == currentApproverId);
                    if (activeApprover != null) {
                        approver.SetSuccessor (activeApprover);
                    }
                }
            }

            return mainApprover;
        }
    }
}
namespace ChainOfResponsibility {
    public class Director : Approver {
        public Director (string id) : base (id) { }
        public override (bool, ProcessingLevel) ProcessRequest (Purchase purchase) => purchase.Amount < 10 ? (true, ProcessingLevel.Accepted) : successor.ProcessRequest (purchase);
    }
}

namespace ChainOfResponsibility {
    public class President : Approver {
        public President (string id) : base (id) { }
        public override (bool, ProcessingLevel) ProcessRequest (Purchase purchase) => purchase.Amount < 20 ? (true, ProcessingLevel.EscalationLevelTwo) : (false, ProcessingLevel.Rejected);
    }
}
namespace ChainOfResponsibility {
    public enum ProcessingLevel {
        Accepted,
        EscalationLevelOne,
        EscalationLevelTwo,
        Rejected
    }
}

namespace ChainOfResponsibility {
    public struct Purchase {
        public Purchase (double amount, int number, string description) {
            Amount = amount;
            Number = number;
            Description = description;
        }

        public double Amount { get; }
        public int Number { get; }
        public string Description { get; }

        public static explicit operator Purchase ((double, int, string) tuple) {
            return new Purchase (tuple.Item1, tuple.Item2, tuple.Item3);
        }
    }
}

namespace ChainOfResponsibility {
    public class VicePresident : Approver {
        public VicePresident (string id) : base (id) { }
        public override (bool, ProcessingLevel) ProcessRequest (Purchase purchase) => purchase.Amount < 15 ? (true, ProcessingLevel.EscalationLevelOne) : successor.ProcessRequest (purchase);
    }
}
