import type { Locale } from "@/lib/i18n/config";
import { COOKIES, CONSENT_POLICY_VERSION, type ConsentCategory } from "@/lib/consent/config";
import type { LegalDoc } from "./types";

/**
 * The Cookie Policy, built from the same cookie table the consent dialog shows —
 * so the two cannot disagree about what is set, by whom, for how long.
 */

const COPY: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    intro: string;
    head: string[];
    categories: Record<ConsentCategory, { title: string; body: string }>;
    none: string;
    choiceTitle: string;
    choice: string[];
    moreTitle: string;
    more: string;
  }
> = {
  en: {
    title: "Cookie Policy",
    subtitle: "Cookies and similar technologies on this website",
    intro:
      "This policy lists every cookie and similar technology this website uses, why, and for how long. It supplements Section 8 of our Privacy Policy.",
    head: ["Name", "Provider", "Purpose", "Duration"],
    categories: {
      necessary: {
        title: "Strictly necessary",
        body: "Needed for the website to work and for features you ask for. They do not require consent and cannot be switched off.",
      },
      analytics: {
        title: "Analytics",
        body: "Google Analytics 4 counts visits and shows how the website is used. Loaded only after you accept analytics; Google Signals and ad personalisation are off, and no personal data is sent in events.",
      },
      marketing: {
        title: "Marketing",
        body: "Used to measure advertising or show relevant ads elsewhere. Loaded only after you accept marketing.",
      },
    },
    none: "None are in use at the moment.",
    choiceTitle: "Your choice",
    choice: [
      "Nothing except strictly necessary cookies is set before you make a choice, and continuing to browse is not a choice.",
      "Accept all and Reject all are equally available in the banner; Customize lets you choose per category.",
      "You can change or withdraw your choice at any time with “Cookie settings” in the footer of every page. Withdrawing stops analytics immediately and deletes its cookies.",
      "Your choice is kept for 12 months, after which we ask again — and sooner if the cookies we use change.",
    ],
    moreTitle: "More information",
    more: "How we process personal data, and your rights, are described in the Privacy Policy. Questions: basiccoffeers@gmail.com.",
  },
  ru: {
    title: "Политика cookie",
    subtitle: "Cookie и схожие технологии на этом сайте",
    intro:
      "В этой политике перечислены все cookie и схожие технологии, которые использует сайт, — зачем и на какой срок. Она дополняет раздел 8 нашей Политики конфиденциальности.",
    head: ["Название", "Поставщик", "Назначение", "Срок"],
    categories: {
      necessary: {
        title: "Строго необходимые",
        body: "Нужны для работы сайта и функций, о которых вы просите. Не требуют согласия и не отключаются.",
      },
      analytics: {
        title: "Аналитика",
        body: "Google Analytics 4 считает посещения и показывает, как используется сайт. Загружается только после того, как вы приняли аналитику; Google Signals и персонализация рекламы выключены, персональные данные в событиях не передаются.",
      },
      marketing: {
        title: "Маркетинг",
        body: "Используются для оценки рекламы и показа релевантных объявлений на других сайтах. Загружаются только после вашего согласия на маркетинг.",
      },
    },
    none: "Сейчас не используются.",
    choiceTitle: "Ваш выбор",
    choice: [
      "До вашего выбора устанавливаются только строго необходимые cookie, а продолжение просмотра сайта выбором не считается.",
      "Кнопки «Принять все» и «Отклонить все» в баннере равнозначны; «Настроить» позволяет выбрать по категориям.",
      "Изменить или отозвать выбор можно в любой момент по ссылке «Настройки cookie» в подвале любой страницы. Отзыв сразу останавливает аналитику и удаляет её cookie.",
      "Выбор хранится 12 месяцев, после чего мы спросим снова — и раньше, если изменится набор cookie.",
    ],
    moreTitle: "Подробнее",
    more: "Как мы обрабатываем персональные данные и какие у вас права, описано в Политике конфиденциальности. Вопросы: basiccoffeers@gmail.com.",
  },
  sr: {
    title: "Politika kolačića",
    subtitle: "Kolačići i slične tehnologije na ovom sajtu",
    intro:
      "Ova politika navodi sve kolačiće i slične tehnologije koje sajt koristi, zašto i koliko dugo. Dopunjuje odeljak 8 naše Politike privatnosti.",
    head: ["Naziv", "Pružalac", "Svrha", "Trajanje"],
    categories: {
      necessary: {
        title: "Neophodni",
        body: "Potrebni za rad sajta i funkcije koje tražite. Ne zahtevaju pristanak i ne mogu se isključiti.",
      },
      analytics: {
        title: "Analitika",
        body: "Google Analytics 4 broji posete i pokazuje kako se sajt koristi. Učitava se tek kada prihvatite analitiku; Google Signals i personalizacija oglasa su isključeni, a u događajima se ne šalju podaci o ličnosti.",
      },
      marketing: {
        title: "Marketing",
        body: "Koriste se za merenje oglašavanja ili prikaz relevantnih oglasa na drugim mestima. Učitavaju se tek kada prihvatite marketing.",
      },
    },
    none: "Trenutno se ne koriste.",
    choiceTitle: "Vaš izbor",
    choice: [
      "Pre vašeg izbora postavljaju se samo neophodni kolačići, a nastavak pregledanja sajta nije izbor.",
      "„Prihvati sve“ i „Odbij sve“ su u baneru podjednako dostupni; „Prilagodi“ omogućava izbor po kategorijama.",
      "Izbor možete promeniti ili povući u svakom trenutku putem „Podešavanja kolačića“ u podnožju svake stranice. Povlačenje odmah zaustavlja analitiku i briše njene kolačiće.",
      "Izbor se čuva 12 meseci, nakon čega vas ponovo pitamo — i ranije, ako se promene kolačići koje koristimo.",
    ],
    moreTitle: "Više informacija",
    more: "Kako obrađujemo podatke o ličnosti i koja su vaša prava, opisano je u Politici privatnosti. Pitanja: basiccoffeers@gmail.com.",
  },
};

function build(locale: Locale): LegalDoc {
  const copy = COPY[locale];
  const categories: ConsentCategory[] = ["necessary", "analytics", "marketing"];
  return {
    title: copy.title,
    subtitle: copy.subtitle,
    updated: CONSENT_POLICY_VERSION,
    intro: [copy.intro],
    sections: [
      ...categories.map((category) => ({
        title: copy.categories[category].title,
        blocks: [
          copy.categories[category].body,
          COOKIES[category].length > 0
            ? {
                table: {
                  head: copy.head,
                  rows: COOKIES[category].map((cookie) => [
                    cookie.name,
                    cookie.provider,
                    cookie.purpose[locale],
                    cookie.duration[locale],
                  ]),
                },
              }
            : copy.none,
        ],
      })),
      { title: copy.choiceTitle, blocks: [{ list: copy.choice }] },
      { title: copy.moreTitle, blocks: [copy.more] },
    ],
  };
}

export const cookiePolicy: Record<Locale, LegalDoc> = {
  en: build("en"),
  ru: build("ru"),
  sr: build("sr"),
};
