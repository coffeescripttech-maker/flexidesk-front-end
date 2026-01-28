import { useState, useEffect } from "react";
import { Info, Plus, Trash2, AlertCircle } from "lucide-react";

// Policy templates matching the backend PolicyManager
const POLICY_TEMPLATES = {
  flexible: {
    type: 'flexible',
    allowCancellation: true,
    automaticRefund: true,
    tiers: [
      { hoursBeforeBooking: 24, refundPercentage: 100, description: 'Full refund' },
      { hoursBeforeBooking: 0, refundPercentage: 0, description: 'No refund' }
    ],
    processingFeePercentage: 0,
    customNotes: ''
  },
  moderate: {
    type: 'moderate',
    allowCancellation: true,
    automaticRefund: true,
    tiers: [
      { hoursBeforeBooking: 168, refundPercentage: 100, description: 'Full refund (7+ days)' },
      { hoursBeforeBooking: 48, refundPercentage: 50, description: '50% refund (2-7 days)' },
      { hoursBeforeBooking: 0, refundPercentage: 0, description: 'No refund (<2 days)' }
    ],
    processingFeePercentage: 5,
    customNotes: ''
  },
  strict: {
    type: 'strict',
    allowCancellation: true,
    automaticRefund: false,
    tiers: [
      { hoursBeforeBooking: 336, refundPercentage: 50, description: '50% refund (14+ days)' },
      { hoursBeforeBooking: 0, refundPercentage: 0, description: 'No refund (<14 days)' }
    ],
    processingFeePercentage: 10,
    customNotes: ''
  },
  custom: {
    type: 'custom',
    allowCancellation: true,
    automaticRefund: false,
    tiers: [
      { hoursBeforeBooking: 24, refundPercentage: 100, description: 'Full refund' }
    ],
    processingFeePercentage: 0,
    customNotes: ''
  },
  none: {
    type: 'none',
    allowCancellation: false,
    automaticRefund: false,
    tiers: [],
    processingFeePercentage: 0,
    customNotes: ''
  }
};

function hoursToReadable(hours) {
  if (hours === 0) return 'Less than 1 hour';
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

export default function CancellationPolicySection({ policy, onChange }) {
  const [selectedType, setSelectedType] = useState(policy?.type || 'moderate');
  const [localPolicy, setLocalPolicy] = useState(
    policy || POLICY_TEMPLATES.moderate
  );
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (policy) {
      setSelectedType(policy.type || 'moderate');
      setLocalPolicy(policy);
    }
  }, [policy]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    const template = POLICY_TEMPLATES[type];
    setLocalPolicy(template);
    setValidationErrors([]);
    onChange(template);
  };

  const handlePolicyChange = (updates) => {
    const updated = { ...localPolicy, ...updates };
    setLocalPolicy(updated);
    validatePolicy(updated);
    onChange(updated);
  };

  const validatePolicy = (policyToValidate) => {
    const errors = [];
    
    if (policyToValidate.type === 'custom' && policyToValidate.tiers.length > 0) {
      // Check for duplicate hours
      const hours = policyToValidate.tiers.map(t => t.hoursBeforeBooking);
      const duplicates = hours.filter((h, i) => hours.indexOf(h) !== i);
      if (duplicates.length > 0) {
        errors.push(`Duplicate tier hours: ${duplicates.join(', ')}`);
      }

      // Check refund percentages
      for (const tier of policyToValidate.tiers) {
        if (tier.refundPercentage < 0 || tier.refundPercentage > 100) {
          errors.push(`Invalid refund percentage: ${tier.refundPercentage}%`);
        }
      }

      // Check processing fee
      if (policyToValidate.processingFeePercentage < 0 || policyToValidate.processingFeePercentage > 100) {
        errors.push(`Invalid processing fee: ${policyToValidate.processingFeePercentage}%`);
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  return (
    <div className="space-y-6">
      {/* Policy Type Selector */}
      <div>
        <label className="text-sm font-medium text-ink block mb-3">
          Choose a cancellation policy type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { value: 'flexible', label: 'Flexible', desc: 'Full refund 24h before' },
            { value: 'moderate', label: 'Moderate', desc: 'Balanced protection' },
            { value: 'strict', label: 'Strict', desc: 'Maximum protection' },
            { value: 'custom', label: 'Custom', desc: 'Define your own rules' },
            { value: 'none', label: 'No Cancellation', desc: 'No refunds allowed' }
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeChange(value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedType === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  checked={selectedType === value}
                  onChange={() => handleTypeChange(value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Policy Preview */}
      {selectedType !== 'none' && (
        <div className="bg-slate-50 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Refund Schedule</span>
          </div>
          <div className="space-y-2">
            {localPolicy.tiers.map((tier, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {tier.hoursBeforeBooking > 0 
                    ? `Cancel ${hoursToReadable(tier.hoursBeforeBooking)} before`
                    : 'Cancel less than above'}
                </span>
                <span className={`font-medium ${
                  tier.refundPercentage === 100 ? 'text-green-600' :
                  tier.refundPercentage > 0 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {tier.refundPercentage}% refund
                </span>
              </div>
            ))}
            {localPolicy.processingFeePercentage > 0 && (
              <div className="text-xs text-slate-500 mt-2 pt-2 border-t">
                Processing fee: {localPolicy.processingFeePercentage}% of refund amount
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Policy Builder */}
      {selectedType === 'custom' && (
        <CustomPolicyBuilder
          policy={localPolicy}
          onChange={handlePolicyChange}
        />
      )}

      {/* Policy Configuration Options */}
      {selectedType !== 'none' && (
        <PolicyConfigurationOptions
          policy={localPolicy}
          onChange={handlePolicyChange}
          isCustom={selectedType === 'custom'}
        />
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-800 mb-1">
                Policy Validation Errors
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* No Cancellation Message */}
      {selectedType === 'none' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-900 mb-1">
                No Cancellation Policy
              </div>
              <div className="text-sm text-amber-800">
                Clients will not be able to cancel bookings or request refunds. This policy
                provides maximum revenue protection but may reduce booking confidence.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Policy Builder Component
function CustomPolicyBuilder({ policy, onChange }) {
  const addTier = () => {
    const newTier = {
      hoursBeforeBooking: 24,
      refundPercentage: 50,
      description: 'New tier'
    };
    onChange({
      tiers: [...policy.tiers, newTier]
    });
  };

  const removeTier = (index) => {
    const newTiers = policy.tiers.filter((_, i) => i !== index);
    onChange({ tiers: newTiers });
  };

  const updateTier = (index, updates) => {
    const newTiers = policy.tiers.map((tier, i) =>
      i === index ? { ...tier, ...updates } : tier
    );
    onChange({ tiers: newTiers });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Custom Refund Tiers</h4>
        <button
          type="button"
          onClick={addTier}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Tier
        </button>
      </div>

      <div className="space-y-4">
        {policy.tiers.map((tier, index) => (
          <div key={index} className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Tier {index + 1}</span>
              {policy.tiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTier(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Hours Before Booking */}
              <div>
                <label className="text-xs text-slate-600 block mb-1">
                  Hours before booking
                </label>
                <input
                  type="number"
                  min="0"
                  value={tier.hoursBeforeBooking}
                  onChange={(e) => updateTier(index, {
                    hoursBeforeBooking: parseInt(e.target.value) || 0
                  })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <div className="text-xs text-slate-500 mt-1">
                  {hoursToReadable(tier.hoursBeforeBooking)}
                </div>
              </div>

              {/* Refund Percentage */}
              <div>
                <label className="text-xs text-slate-600 block mb-1">
                  Refund percentage
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={tier.refundPercentage}
                    onChange={(e) => updateTier(index, {
                      refundPercentage: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tier.refundPercentage}
                      onChange={(e) => updateTier(index, {
                        refundPercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                      className="w-20 rounded-md border px-2 py-1 text-sm"
                    />
                    <span className="text-sm font-medium">{tier.refundPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-slate-600 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={tier.description}
                  onChange={(e) => updateTier(index, {
                    description: e.target.value
                  })}
                  placeholder="e.g., Full refund"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500 bg-blue-50 rounded p-3">
        <strong>Tip:</strong> Tiers should be ordered from most hours before booking to least.
        The system will automatically apply the appropriate tier based on when the client cancels.
      </div>
    </div>
  );
}

// Policy Configuration Options Component
function PolicyConfigurationOptions({ policy, onChange, isCustom }) {
  return (
    <div className="space-y-4 border rounded-lg p-4 bg-white">
      <h4 className="text-sm font-medium">Policy Configuration</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Processing Fee */}
        {isCustom && (
          <div>
            <label className="text-xs text-slate-600 block mb-1">
              Processing fee percentage
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={policy.processingFeePercentage}
                onChange={(e) => onChange({
                  processingFeePercentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                })}
                className="w-24 rounded-md border px-3 py-2 text-sm"
              />
              <span className="text-sm">%</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Fee deducted from refund amount to cover processing costs
            </div>
          </div>
        )}

        {/* Automatic Refund Toggle */}
        <div>
          <label className="text-xs text-slate-600 block mb-2">
            Automatic refund processing
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={policy.automaticRefund}
              onChange={(e) => onChange({
                automaticRefund: e.target.checked
              })}
              className="rounded"
            />
            <span className="text-sm">Enable automatic refunds</span>
          </label>
          <div className="text-xs text-slate-500 mt-1">
            When enabled, 100% refunds will be processed automatically without your approval
          </div>
        </div>
      </div>

      {/* Custom Notes */}
      <div>
        <label className="text-xs text-slate-600 block mb-1">
          Custom notes (optional)
        </label>
        <textarea
          rows={3}
          value={policy.customNotes || ''}
          onChange={(e) => onChange({
            customNotes: e.target.value
          })}
          placeholder="Add any additional information about your cancellation policy..."
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="text-xs text-slate-500 mt-1">
          These notes will be displayed to clients along with your policy
        </div>
      </div>
    </div>
  );
}
