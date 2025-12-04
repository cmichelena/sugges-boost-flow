import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            This Privacy Policy explains how Vector56 ("we", "our", "us") collects, uses, and protects information across all Vector56 applications and platforms, including but not limited to Quiet Shift, Suggistit, Hive56, Axis56, and any future products ("the Apps").
          </p>
          
          <p>By using the Apps, you agree to the practices described below.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
          
          <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1.1 Information You Provide</h3>
          <p>Depending on the App, you may provide:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account details (name, email, password or authentication token)</li>
            <li>Written content (e.g., reflections, journal entries, suggestions, tasks, comments)</li>
            <li>Workspace names, project names, tags, and metadata</li>
            <li>Preferences and settings</li>
          </ul>

          <h4 className="text-lg font-medium text-foreground mt-4 mb-2">Individual Apps (e.g., Quiet Shift)</h4>
          <p>Your personal content (reflections, journals, insights) is private to you unless you explicitly share it.</p>

          <h4 className="text-lg font-medium text-foreground mt-4 mb-2">Team Apps (e.g., Suggistit, Hive56, Axis56)</h4>
          <p>Content submitted in team or workspace environments may be visible to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Team members</li>
            <li>Workspace owners or administrators</li>
          </ul>
          <p>We do not access, read, or use your content unless required for support or legal compliance.</p>

          <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1.2 Automatically Collected Information</h3>
          <p>We may collect:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Device type, operating system, and app version</li>
            <li>IP address (for security, approximate region only)</li>
            <li>Log data (crashes, errors, performance metrics)</li>
            <li>Cookies/local storage to maintain login sessions</li>
            <li>Basic usage data to improve stability and experience</li>
          </ul>
          <p>We do not collect sensitive personal data unless you voluntarily provide it.</p>

          <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1.3 Third-Party Services</h3>
          <p>Our Apps may rely on trusted third-party providers, such as:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Backend hosting and database providers</li>
            <li>Authentication services</li>
            <li>Analytics (anonymised)</li>
            <li>Push notification providers (OneSignal, Firebase)</li>
            <li>Capacitor plugins for mobile functionality</li>
          </ul>
          <p>These providers process data on our behalf under strict privacy and security contracts.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. How We Use Information</h2>
          <p>We use information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide and improve the Apps</li>
            <li>Deliver features such as journaling, suggestions, task management, insights, and notifications</li>
            <li>Maintain secure login sessions</li>
            <li>Ensure app reliability and performance</li>
            <li>Provide customer support</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className="font-medium text-foreground">We do not sell your data and do not use your information for advertising.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Data Visibility: Individual vs Team Apps</h2>
          
          <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3.1 Individual Apps (Quiet Shift)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your entries, reflections, and notes are private.</li>
            <li>No one, including Vector56, can view your personal content unless you request support requiring access.</li>
            <li>Data is used solely to deliver the service.</li>
          </ul>

          <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3.2 Team / Organisation Apps (Suggistit, Hive56, Axis56)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Content added in a team workspace may be visible to other members of that workspace.</li>
            <li>Workspace owners/administrators control access, permissions, and deletion.</li>
            <li>When a user leaves a team, their content generally remains available to the team unless deleted by an administrator.</li>
          </ul>
          <p>Vector56 does not intervene in workspace-level data governance unless required for security or legal purposes.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. How We Store Data</h2>
          <p>Data is stored securely using modern cloud infrastructure with:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Encrypted connections (HTTPS/TLS)</li>
            <li>Access controls</li>
            <li>Industry-standard security practices</li>
          </ul>
          <p>We take appropriate measures to protect your information but cannot guarantee absolute security.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. How We Share Data</h2>
          <p>We only share data with:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Essential service providers (see Section 1.3)</li>
            <li>Legal authorities when required by law</li>
          </ul>
          <p>We do not share or sell your information to advertisers or third parties unrelated to providing the Apps.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Push Notifications</h2>
          <p>If you enable notifications:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your device token may be processed by notification providers</li>
            <li>You may turn off notifications at any time in system settings</li>
          </ul>
          <p>We do not include personal content in notifications.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Your Rights</h2>
          <p>Subject to applicable laws, you may request:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access to your data</li>
            <li>Correction of inaccurate information</li>
            <li>Deletion of your data or account</li>
            <li>Export of your data (where technologically feasible)</li>
            <li>Withdrawal of consent for optional features</li>
          </ul>
          <p>Contact us at the email below to make a request.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Data Retention</h2>
          <p>We retain data only as long as necessary to operate the Apps.</p>
          
          <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Individual Apps</h3>
          <p>If you delete your account, personal content may be permanently removed.</p>
          
          <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Team Apps</h3>
          <p>Team/workspace data remains with the organisation unless the workspace is deleted.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">9. Children's Privacy</h2>
          <p>The Apps are not intended for children under 13, and we do not knowingly collect data from minors. If you believe data has been collected from a child, contact us immediately.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Significant changes may be communicated through the Apps or via email. The "Last updated" date reflects the current version.</p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">11. Contact Us</h2>
          <p>For any privacy-related questions or requests, contact:</p>
          <div className="mt-4">
            <p className="font-medium text-foreground">Vector56</p>
            <p>Email: <a href="mailto:privacy@vector56.com" className="text-primary hover:underline">privacy@vector56.com</a></p>
            <p>Website: <a href="https://vector56.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vector56.com</a></p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;