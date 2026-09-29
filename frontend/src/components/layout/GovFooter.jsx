import React from 'react';
import { ExternalLink, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export function GovFooter() {
  const { language, t } = useLanguage();

  return (
    <footer className="bg-[#0b253a] text-slate-300 text-xs border-t-4 border-[#0b3b60] mt-12 select-none">
      {/* Upper 4-Column Directory Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Scheme Mandate & Central Authority */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF9933]" />
              <h3 className="font-extrabold text-white text-sm tracking-wide uppercase">
                {t('footerAboutTitle', 'About MPLADS')}
              </h3>
            </div>
            <p className="text-slate-300 text-[11.5px] leading-relaxed">
              {t('footerAboutText', 'The Members of Parliament Local Area Development Scheme (MPLADS) is a Central Sector Scheme under which Hon\'ble MPs recommend works creating durable community assets based on local civic needs.')}
            </p>
            <div className="pt-2 text-[11px] text-amber-300 flex items-center gap-1.5 font-semibold">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{language === 'hi' ? 'एआई-संचालित सतर्कता एवं विसंगति पहचान' : 'AI-Powered Vigilance & Fraud Detection'}</span>
            </div>
          </div>

          {/* Column 2: Key National Portals */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              <h3 className="font-extrabold text-white text-sm tracking-wide uppercase">
                {language === 'hi' ? 'राष्ट्रीय पोर्टल' : 'National Portals'}
              </h3>
            </div>
            <ul className="space-y-2 text-[11.5px]">
              <li>
                <a href="https://www.india.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>{language === 'hi' ? 'भारत का राष्ट्रीय पोर्टल (india.gov.in)' : 'National Portal of India (india.gov.in)'}</span>
                  <ExternalLink size={10} className="text-slate-400" />
                </a>
              </li>
              <li>
                <a href="https://www.digitalindia.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>{language === 'hi' ? 'डिजिटल इंडिया कार्यक्रम' : 'Digital India Programme'}</span>
                  <ExternalLink size={10} className="text-slate-400" />
                </a>
              </li>
              <li>
                <a href="https://pfms.nic.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>{language === 'hi' ? 'सार्वजनिक वित्तीय प्रबंधन प्रणाली (PFMS)' : 'Public Financial Management System (PFMS)'}</span>
                  <ExternalLink size={10} className="text-slate-400" />
                </a>
              </li>
              <li>
                <a href="https://bhuvan.nrsc.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>{language === 'hi' ? 'भुवन इसरो भू-पोर्टल (जियोटैगिंग)' : 'Bhuvan ISRO Geoportal (Geotagging)'}</span>
                  <ExternalLink size={10} className="text-slate-400" />
                </a>
              </li>
              <li>
                <a href="https://sansad.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>{language === 'hi' ? 'भारतीय संसद (संसद)' : 'Parliament of India (Sansad)'}</span>
                  <ExternalLink size={10} className="text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance Policies & Statutory Links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#138808]" />
              <h3 className="font-extrabold text-white text-sm tracking-wide uppercase">
                {language === 'hi' ? 'नीतियां एवं दिशानिर्देश' : 'Policies & Guidelines'}
              </h3>
            </div>
            <ul className="space-y-2 text-[11.5px]">
              <li>
                <span className="hover:text-amber-300 cursor-pointer transition-colors">
                  {language === 'hi' ? 'संशोधित एमपीलैड्स दिशानिर्देश (2023)' : 'Revised MPLADS Guidelines (2023)'}
                </span>
              </li>
              <li>
                <span className="hover:text-amber-300 cursor-pointer transition-colors">
                  {language === 'hi' ? 'सूचना का अधिकार (RTI) प्रकटीकरण' : 'Right to Information (RTI) Disclosures'}
                </span>
              </li>
              <li>
                <span className="hover:text-amber-300 cursor-pointer transition-colors">
                  {language === 'hi' ? 'वेबसाइट नीतियां एवं उपयोग की शर्तें' : 'Website Policies & Terms of Use'}
                </span>
              </li>
              <li>
                <span className="hover:text-amber-300 cursor-pointer transition-colors">
                  {language === 'hi' ? 'हाइपरलिंकिंग एवं कॉपीराइट नीति' : 'Hyperlinking & Copyright Policy'}
                </span>
              </li>
              <li>
                <span className="hover:text-amber-300 cursor-pointer transition-colors">
                  {language === 'hi' ? 'सुरक्षा ऑडिट एवं अनुपालन प्रमाणपत्र' : 'Security Audit & Compliance Certificate'}
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Nodal Helpdesk & Contact */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="font-extrabold text-white text-sm tracking-wide uppercase">
                {language === 'hi' ? 'नोडल संपर्क' : 'Nodal Contact'}
              </h3>
            </div>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  {language === 'hi'
                    ? 'एमपीलैड्स प्रभाग, सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय, खुर्शीद लाल भवन, जनपथ, नई दिल्ली - 110001'
                    : 'MPLADS Division, Ministry of Statistics and Programme Implementation, Khurshid Lal Bhawan, Janpath, New Delhi - 110001'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-amber-400 flex-shrink-0" />
                <span>{language === 'hi' ? 'टोल-फ्री हेल्पलाइन: 1800-11-2026' : 'Toll-Free Helpline: 1800-11-2026'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-amber-400 flex-shrink-0" />
                <span>mplads-helpdesk@nic.in</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Legal & NIC Hosting Credits */}
      <div className="bg-[#061928] py-5 px-4 sm:px-6 lg:px-8 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="font-semibold text-slate-300">
              {language === 'hi'
                ? 'वेबसाइट सामग्री प्रबंधन: सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय (MoSPI), भारत सरकार'
                : 'Website Content Managed by Ministry of Statistics and Programme Implementation (MoSPI), Government of India'}
            </p>
            <p className="text-slate-500 mt-0.5">
              {language === 'hi'
                ? 'डिज़ाइन, विकास एवं होस्टिंग: राष्ट्रीय सूचना विज्ञान केंद्र (NIC) / एआई निगरानी एवं विश्लेषण समूह'
                : 'Designed, Developed and Hosted by National Informatics Centre (NIC) / AI Monitoring & Analytics Group'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 text-slate-400 text-[10.5px]">
            <span>{language === 'hi' ? 'अंतिम अद्यतन: 23 सितंबर 2026' : 'Last Updated: 23 September 2026'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {language === 'hi' ? 'कुल अनुक्रमित कार्य: 2,35,572' : 'Total Works Indexed: 235,572'}
            </span>
          </div>
        </div>
      </div>

      {/* Indian National Tricolor Baseline */}
      <div className="h-1.5 w-full flex">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>
    </footer>
  );
}
