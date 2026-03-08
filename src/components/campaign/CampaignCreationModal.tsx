'use client'

import { useState, useCallback } from 'react'
import type { Campaign, CampaignTemplateRef, CreateCampaignPayload } from '@/types'
import { validateCampaignStep } from '@/lib/campaign-helpers'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (campaign: Campaign) => void
  templates: CampaignTemplateRef[]
}

const STEP_LABELS = [
  'Campaign Basics',
  'Your Reward',
  'KPI & Goal',
  'Settings',
  'Preview & Publish',
]

const INITIAL_FORM_DATA: Partial<CreateCampaignPayload> = {
  name: '',
  headline: '',
  subheadline: '',
  description: '',
  destination_url: '',
  benefits: [],
  how_it_works: [],
  kpi_type: 'clicks',
  show_countdown: false,
  social_proof_visible: true,
  reward_tiers: [],
}

export default function CampaignCreationModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] =
    useState<Partial<CreateCampaignPayload>>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const updateFormData = useCallback(
    (updates: Partial<CreateCampaignPayload>) => {
      setFormData((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  const hasProgress = useCallback(() => {
    return !!(
      formData.name?.trim() ||
      formData.headline?.trim() ||
      formData.destination_url?.trim() ||
      (formData.reward_tiers && formData.reward_tiers.length > 0)
    )
  }, [formData])

  const handleClose = useCallback(() => {
    if (hasProgress()) {
      const confirmed = window.confirm(
        'Are you sure? Your progress will be lost.'
      )
      if (!confirmed) return
    }
    setCurrentStep(1)
    setFormData(INITIAL_FORM_DATA)
    setErrors({})
    setSubmitError(null)
    onClose()
  }, [hasProgress, onClose])

  const handleNext = useCallback(() => {
    const stepErrors = validateCampaignStep(currentStep, formData)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setCurrentStep((s) => Math.min(s + 1, 5))
  }, [currentStep, formData])

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }, [])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to create campaign')
      }
      const created: Campaign = await res.json()
      onSuccess(created)
      setCurrentStep(1)
      setFormData(INITIAL_FORM_DATA)
      setErrors({})
      onClose()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong'
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSuccess, onClose])

  if (!isOpen) return null

  return (
    <div className="ccm-backdrop" onClick={handleClose}>
      <div
        className="ccm-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ─────────────────────────────── */}
        <header className="ccm-header">
          <div className="ccm-header-left">
            <span className="ccm-logo">ValueShare</span>
            <span className="ccm-header-sep">/</span>
            <span className="ccm-header-title">New Campaign</span>
          </div>

          <nav className="ccm-steps">
            {STEP_LABELS.map((_, i) => {
              const stepNum = i + 1
              const completed = stepNum < currentStep
              const current = stepNum === currentStep
              return (
                <div key={stepNum} className="ccm-step-item">
                  {i > 0 && (
                    <div
                      className={`ccm-step-line${
                        stepNum <= currentStep ? ' ccm-step-line--active' : ''
                      }`}
                    />
                  )}
                  <div
                    className={`ccm-step-dot${
                      completed
                        ? ' ccm-step-dot--done'
                        : current
                          ? ' ccm-step-dot--current'
                          : ''
                    }`}
                  >
                    {stepNum}
                  </div>
                </div>
              )
            })}
          </nav>

          <button
            className="ccm-close"
            onClick={handleClose}
            aria-label="Close"
          >
            &#x2715;
          </button>
        </header>

        {/* ── BODY ───────────────────────────────── */}
        <div className="ccm-body">
          <div className="ccm-left">
            <div key={currentStep} className="animate-fade-up">
              <StepContent
                step={currentStep}
                formData={formData}
                errors={errors}
                updateFormData={updateFormData}
              />
            </div>
          </div>

          <div className="ccm-right">
            <PreviewPlaceholder formData={formData} />
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────── */}
        <footer className="ccm-footer">
          <div>
            {currentStep > 1 ? (
              <button
                className="vs-btn vs-btn-ghost"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                &larr; Back
              </button>
            ) : (
              <button
                className="vs-btn vs-btn-ghost"
                onClick={handleClose}
                style={{ opacity: 0.6 }}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="ccm-footer-right">
            {submitError && (
              <span className="ccm-error-msg">{submitError}</span>
            )}
            <span className="ccm-step-label">
              Step {currentStep} of 5
            </span>
            {currentStep < 5 ? (
              <button
                className="vs-btn vs-btn-primary"
                onClick={handleNext}
              >
                Continue &rarr;
              </button>
            ) : (
              <button
                className="vs-btn vs-btn-primary ccm-publish-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="ccm-spinner" />
                    Publishing&hellip;
                  </>
                ) : (
                  'Publish Campaign \u2192'
                )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

/* ── STEP CONTENT (placeholders) ──────────────────────── */

function StepContent({
  step,
}: {
  step: number
  formData: Partial<CreateCampaignPayload>
  errors: Record<string, string>
  updateFormData: (u: Partial<CreateCampaignPayload>) => void
}) {
  return (
    <div>
      <h2 className="ccm-step-title">
        Step {step}: {STEP_LABELS[step - 1]}
      </h2>
      <p style={{ color: 'var(--vs-text-3)', marginTop: 8, fontSize: 13 }}>
        Coming in next prompt
      </p>
    </div>
  )
}

/* ── PREVIEW PLACEHOLDER ──────────────────────────────── */

function PreviewPlaceholder({
  formData,
}: {
  formData: Partial<CreateCampaignPayload>
}) {
  return (
    <div className="ccm-preview">
      <span className="ccm-preview-label">Live Preview</span>
      <p className="ccm-preview-sub">
        Your landing page will appear here as you fill in the details
      </p>

      <div className="ccm-pw">
        {/* Header bar */}
        <div className="ccm-pw-bar" style={{ width: '40%', height: 10 }} />

        {/* Hero area */}
        <div className="ccm-pw-hero">
          {formData.hero_image_url ? (
            <img
              src={formData.hero_image_url}
              alt="Hero preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 2,
              }}
            />
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--vs-text-3)"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          )}
        </div>

        {/* Headline */}
        <p className="ccm-pw-headline">
          {formData.headline || 'Your Headline'}
        </p>

        {/* Description lines */}
        <div className="ccm-pw-bar" style={{ width: '90%', height: 6 }} />
        <div
          className="ccm-pw-bar"
          style={{ width: '60%', height: 6, marginTop: 6 }}
        />

        {/* Benefits */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(formData.benefits?.length
            ? formData.benefits
            : ['Benefit 1', 'Benefit 2', 'Benefit 3']
          ).map((b, i) => (
            <div key={i} className="ccm-pw-benefit">
              <span style={{ color: 'var(--vs-accent)', fontSize: 11 }}>
                &#x2713;
              </span>
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* CTA area */}
        <div className="ccm-pw-cta">
          <div className="ccm-pw-cta-input" />
          <div className="ccm-pw-cta-btn" />
        </div>
      </div>
    </div>
  )
}
