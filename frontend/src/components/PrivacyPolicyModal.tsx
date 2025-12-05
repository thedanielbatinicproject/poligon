import React, { useEffect, useRef, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
}

const portalRoot = document.body

// Fetch admin email from backend
const fetchAdminEmail = async (): Promise<string> => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE || ''
    const response = await fetch(`${baseUrl}/api/utility/admin-info`)
    if (response.ok) {
      const data = await response.json()
      return data.email || 'support@poligon.live'
    }
  } catch (e) {
    console.warn('Failed to fetch admin email:', e)
  }
  return 'support@poligon.live'
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const prevOverflowRef = useRef<string | null>(null)
  const prevPaddingRef = useRef<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [adminEmail, setAdminEmail] = useState<string>('support@poligon.live')
  const historyPushedRef = useRef<boolean>(false)

  // Stable onClose for history handler
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Handle Android/mobile back button using History API
  useEffect(() => {
    if (!isOpen) {
      historyPushedRef.current = false
      return
    }

    // Push a new history state when modal opens
    if (!historyPushedRef.current) {
      window.history.pushState({ privacyModalOpen: true }, '')
      historyPushedRef.current = true
    }

    const handlePopState = (e: PopStateEvent) => {
      // When back button is pressed, close modal instead of navigating
      if (historyPushedRef.current) {
        historyPushedRef.current = false
        onCloseRef.current()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Clean up history state if modal closes without back button
      if (historyPushedRef.current) {
        window.history.back()
        historyPushedRef.current = false
      }
    }
  }, [isOpen])

  // Fetch admin email when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAdminEmail().then(setAdminEmail)
    }
  }, [isOpen])


  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Manage scroll lock when modal is open
  useEffect(() => {
    try {
      if (isOpen) {
        if (prevOverflowRef.current === null) prevOverflowRef.current = document.body.style.overflow
        if (prevPaddingRef.current === null) prevPaddingRef.current = document.body.style.paddingRight

        document.body.style.overflow = 'hidden'
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
        if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`
      } else {
        if (prevOverflowRef.current !== null) {
          document.body.style.overflow = prevOverflowRef.current || ''
          prevOverflowRef.current = null
        }
        if (prevPaddingRef.current !== null) {
          document.body.style.paddingRight = prevPaddingRef.current || ''
          prevPaddingRef.current = null
        }
      }
    } catch (e) {
      console.warn('PrivacyPolicyModal: failed to toggle body scroll', e)
    }

    return () => {
      try {
        if (prevOverflowRef.current !== null) {
          document.body.style.overflow = prevOverflowRef.current || ''
          prevOverflowRef.current = null
        }
        if (prevPaddingRef.current !== null) {
          document.body.style.paddingRight = prevPaddingRef.current || ''
          prevPaddingRef.current = null
        }
      } catch (e) {
        console.warn('PrivacyPolicyModal cleanup error', e)
      }
    }
  }, [isOpen])

  // Focus modal when opened for accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  // Handle overlay click to close modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div 
      className={`privacy-modal-overlay ${isOpen ? 'privacy-modal-open' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div 
        className="privacy-modal"
        ref={modalRef}
        tabIndex={-1}
      >
        <button 
          className="privacy-modal-close" 
          onClick={onClose} 
          aria-label="Close Privacy Policy"
        >
          ×
        </button>

        <div className="privacy-modal-header">
          <h2 id="privacy-modal-title">Poligon Privacy Policy</h2>
        </div>

        <div className="privacy-modal-content">
          <section>
            <h3>1. Introduction</h3>
            <p>
              Welcome to Poligon. We are committed to protecting your personal information and your right to privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. 
              By accessing or using Poligon, you agree to the terms outlined in this policy. We encourage you to read this 
              document carefully to understand our practices regarding your personal data.
            </p>
          </section>

          <section>
            <h3>2. Information We Collect</h3>
            <p>
              We collect information that you provide directly to us, including your name, email address, and any other 
              details you choose to share when creating an account or using our services. Additionally, we may automatically 
              collect certain technical information such as your IP address, browser type, device information, and usage 
              patterns to improve our platform and provide you with a better experience.
            </p>
          </section>

          <section>
            <h3>3. How We Use Your Information</h3>
            <p>
              Your information is used to provide, maintain, and improve our services, communicate with you about updates 
              and changes, respond to your inquiries and support requests, and ensure the security of our platform. We may 
              also use aggregated and anonymized data for analytical purposes to better understand how users interact with 
              Poligon and to develop new features and functionalities.
            </p>
          </section>

          <section>
            <h3>4. Data Sharing and Disclosure</h3>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your data with 
              trusted service providers who assist us in operating our platform, conducting our business, or serving our users, 
              provided that those parties agree to keep this information confidential. We may also disclose your information 
              when required by law or to protect our rights and safety.
            </p>
          </section>

          <section>
            <h3>5. Data Security</h3>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over 
              the Internet or electronic storage is completely secure, and we cannot guarantee absolute security. We regularly 
              review and update our security practices to enhance protection of your data.
            </p>
          </section>

          <section>
            <h3>6. Your Rights and Choices</h3>
            <p>
              You have the right to access, correct, update, or delete your personal information at any time. You may also 
              opt out of receiving promotional communications from us by following the unsubscribe instructions provided in 
              those messages. If you wish to exercise any of these rights or have questions about your data, please contact 
              us using the information provided at the end of this policy.
            </p>
          </section>

          <section>
            <h3>7. Cookies and Tracking Technologies</h3>
            <p>
              Poligon uses cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, 
              and understand where our visitors are coming from. You can control cookie preferences through your browser settings 
              and choose to accept or decline cookies. Please note that disabling cookies may affect certain features and 
              functionality of our platform and limit your user experience.
            </p>
          </section>

          <section>
            <h3>8. Changes to This Policy</h3>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal 
              requirements, or other factors. We will notify you of any material changes by posting the updated policy on 
              this page with a revised effective date. We encourage you to review this Privacy Policy periodically to stay 
              informed about how we are protecting your information.
            </p>
          </section>

          <div className="privacy-modal-footer">
            <p>Last updated: December 2025</p>
            <p>If you have any questions about this Privacy Policy, please contact us at {adminEmail}</p>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  )
}
