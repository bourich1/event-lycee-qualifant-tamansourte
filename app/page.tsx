'use client'

import { useState } from 'react'
import HeroSection from '@/components/HeroSection'
import RegisterForm from '@/components/RegisterForm'
import PassSuccessModal from '@/components/PassSuccessModal'

export default function HomePage() {
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [registeredName, setRegisteredName] = useState('')
  const [registeredQrCode, setRegisteredQrCode] = useState('')

  const handleRegisterSuccess = (name: string, qrCode: string) => {
    setRegisteredName(name)
    setRegisteredQrCode(qrCode)
    setShowRegisterForm(false)
    setShowSuccess(true)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection onGetPass={() => setShowRegisterForm(true)} />

      {/* Event Description Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#6c5ce7]/10 border border-[#6c5ce7]/30 text-[#a29bfe] text-sm font-medium font-dm mb-4">
              À propos de l&apos;événement
            </span>
            <h2 className="font-syne font-extrabold text-3xl md:text-4xl text-[#f0f0ff] mb-4">
              Une journée exceptionnelle
            </h2>
            <p className="text-[#8888aa] font-dm max-w-xl mx-auto text-lg">
              Rejoignez-nous pour cet événement unique organisé par le Lycée Qualifiant Tamansourte.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: '🏆',
                title: 'Compétitions',
                description:
                  'Participez à des challenges inter-établissements et montrez vos talents dans différentes disciplines.',
              },
              {
                icon: '🤝',
                title: 'Networking',
                description:
                  'Rencontrez des élèves d\'autres lycées, créez des liens durables et élargissez votre réseau.',
              },
              {
                icon: '🎓',
                title: 'Formation',
                description:
                  'Bénéficiez d\'ateliers et de conférences animés par des professionnels pour enrichir vos compétences.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#13131a] border border-white/[0.08] rounded-2xl p-8 hover:border-[#6c5ce7]/40 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <h3 className="font-syne font-bold text-xl text-[#f0f0ff] mb-3">
                  {card.title}
                </h3>
                <p className="text-[#8888aa] font-dm text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="relative bg-gradient-to-r from-[#13131a] via-[#1a1a2e] to-[#13131a] border border-white/[0.08] rounded-3xl p-10 text-center overflow-hidden">
            {/* glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-96 h-40 bg-[#6c5ce7]/10 blur-3xl rounded-full" />
            </div>
            <h3 className="relative font-syne font-extrabold text-2xl md:text-3xl text-[#f0f0ff] mb-3">
              Prêt à participer ?
            </h3>
            <p className="relative text-[#8888aa] font-dm mb-8 max-w-md mx-auto">
              Inscrivez-vous maintenant et recevez votre pass numérique avec QR code par email.
            </p>
            <button
              onClick={() => setShowRegisterForm(true)}
              className="btn-primary inline-block"
            >
              Obtenir mon pass
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center">
        <p className="text-[#8888aa] font-dm text-sm">
          © {new Date().getFullYear()} Lycée Qualifiant Tamansourte — Tous droits réservés
        </p>
      </footer>

      {/* Modals */}
      {showRegisterForm && (
        <RegisterForm
          onClose={() => setShowRegisterForm(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}

      {showSuccess && (
        <PassSuccessModal
          name={registeredName}
          qrCode={registeredQrCode}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </main>
  )
}
