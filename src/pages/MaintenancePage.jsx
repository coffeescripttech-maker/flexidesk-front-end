import { Wrench, Clock, Mail } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <Wrench className="w-10 h-10 text-amber-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Site Under Maintenance
          </h1>

          {/* Message */}
          <p className="text-lg text-slate-600 mb-8">
            We're currently performing scheduled maintenance to improve your experience.
            <br />
            We'll be back online shortly.
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-6">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Expected Duration</h3>
              <p className="text-sm text-slate-600">
                We expect to be back online soon.
                <br />
                Thank you for your patience.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6">
              <Mail className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Need Help?</h3>
              <p className="text-sm text-slate-600">
                For urgent inquiries, please contact:
                <br />
                <a 
                  href="mailto:support@flexidesk.com" 
                  className="text-blue-600 hover:underline"
                >
                  support@flexidesk.com
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-slate-500">
            <p>We apologize for any inconvenience.</p>
            <p className="mt-2">— The FlexiDesk Team</p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Status: <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              Maintenance Mode
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
