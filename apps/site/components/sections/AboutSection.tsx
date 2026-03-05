import { Phone, Mail, MessageCircle, MapPin, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";

export default async function AboutSection() {
  const t = await getTranslations("about");

  const phoneValue = t("contacts.phoneValue");
  const emailValue = t("contacts.emailValue");
  const telegramValue = t("contacts.telegramValue");
  const addressValue = t("contacts.addressValue");

  const CONTACTS = [
    {
      icon: Phone,
      label: t("contacts.phone"),
      value: phoneValue,
      href: `tel:${phoneValue.replace(/[^\d+]/g, "")}`,
      accent: "bg-mint/10",
      accentText: "text-mint",
    },
    {
      icon: Mail,
      label: t("contacts.email"),
      value: emailValue,
      href: `mailto:${emailValue}`,
      accent: "bg-caramel/10",
      accentText: "text-caramel",
    },
    {
      icon: MessageCircle,
      label: t("contacts.telegram"),
      value: telegramValue,
      href: `https://t.me/${telegramValue.replace("@", "")}`,
      accent: "bg-blue-100",
      accentText: "text-blue-500",
    },
    {
      icon: MapPin,
      label: t("contacts.address"),
      value: addressValue,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressValue)}`,
      accent: "bg-purple-100",
      accentText: "text-purple-500",
    },
    {
      icon: Clock,
      label: t("contacts.support"),
      value: t("contacts.supportHours"),
      href: null,
      accent: "bg-espresso-50",
      accentText: "text-espresso",
    },
  ];

  return (
    <section id="about" className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />

        {/* Company description */}
        <div className="max-w-3xl mx-auto mb-12">
          <Card className="p-6 sm:p-8">
            <p className="text-chocolate/70 leading-relaxed text-center">
              {t("description")}
            </p>
          </Card>
        </div>

        {/* Contacts grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {CONTACTS.map((contact) => {
            const Icon = contact.icon;
            const inner = (
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl ${contact.accent} flex items-center justify-center shrink-0`}
                >
                  <Icon size={22} className={contact.accentText} />
                </div>
                <div>
                  <p className="text-xs text-chocolate/40 mb-0.5">
                    {contact.label}
                  </p>
                  <p className="text-sm font-medium text-espresso-dark">
                    {contact.value}
                  </p>
                </div>
              </div>
            );

            if (contact.href) {
              const isExternal = contact.href.startsWith("http");
              return (
                <a
                  key={contact.label}
                  href={contact.href}
                  className="block"
                  {...(isExternal && {
                    target: "_blank",
                    rel: "noopener noreferrer",
                  })}
                >
                  <Card hover className="p-5">
                    {inner}
                  </Card>
                </a>
              );
            }

            return (
              <Card key={contact.label} hover className="p-5">
                {inner}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
