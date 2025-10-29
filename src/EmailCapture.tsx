import { useState } from "react";
import "./EmailCapture.css";

interface EmailCaptureProps {
  onClose: () => void;
}

export default function EmailCapture({ onClose }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save the email (you'll replace this with actual email service later)
      localStorage.setItem("subscribedEmail", email);
      
      console.log("Email captured:", email);
      setIsSuccess(true);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal" onClick={(e) => e.stopPropagation()}>
        <button className="email-modal-close" onClick={onClose}>
          ×
        </button>
        
        {!isSuccess ? (
          <>
            <h2>Get Daily Running Weather</h2>
            <p>
              Get personalized outfit recommendations sent to your inbox every
              morning based on your local weather.
            </p>
            
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="email-input"
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="email-submit"
              >
                {isSubmitting ? "Subscribing..." : "Get Daily Tips"}
              </button>
            </form>
            
            <p className="email-privacy">
              We'll never spam you. Unsubscribe anytime.
            </p>
          </>
        ) : (
          <div className="email-success">
            <h2>✅ You're all set!</h2>
            <p>Check your inbox for a confirmation email.</p>
          </div>
        )}
      </div>
    </div>
  );
}
