import { ArrowLeft, HelpCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

const faqs = [
  {
    question: "How do I upgrade my plan?",
    answer: "Visit suggistit.com, go to Settings, and manage your subscription there. You can choose from several plans depending on your team size and needs.",
  },
  {
    question: "How do I add team members?",
    answer: "From your dashboard, go to Team and invite members by email. They'll receive an invitation link to join your workspace.",
  },
  {
    question: "How do I cancel my subscription?",
    answer: "Go to Settings > Billing on the web app and follow the cancellation steps. Your access will continue until the end of your current billing period.",
  },
  {
    question: "How do I submit a suggestion?",
    answer: "Click the 'Submit' button from your dashboard or navigation bar. Fill in the title, description, and category, then submit. You can also attach files and submit anonymously if your category allows it.",
  },
  {
    question: "Can I use Suggistit on my phone?",
    answer: "Yes! Suggistit is a Progressive Web App (PWA). You can install it on your phone from your browser for a native app-like experience.",
  },
];

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-bold mb-2">Suggistit Support</h1>
          <p className="text-lg text-muted-foreground">
            Need help? We're here for you.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">
              Still need help? Email us at
            </p>
            <a
              href="mailto:support@suggistit.com"
              className="text-primary font-medium hover:underline"
            >
              support@suggistit.com
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;
