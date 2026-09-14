'use client'

import { useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { ArrowDown, ArrowRight, Plus } from 'lucide-react'
import type { ExperienceProps } from './ProductExperience'
import { formatPrice, rendersFor, storyText, thumbImageFor } from './catalog'
import { BundleBuilder } from './BundleBuilder'

export function DesignRail({ catalog, design, selectedModel, switchDesign }: ExperienceProps) {
  return (
    <nav className="design-rail" aria-label="Switch case design">
      <div>
        <span className="editorial-kicker">The first collection</span>
        <p>
          Find your kind of <em>different.</em>
        </p>
      </div>
      <div className="design-rail-options">
        {catalog.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === design.id}
            onClick={() => switchDesign(item.slug)}
          >
            {thumbImageFor(item, selectedModel) && (
              <img src={thumbImageFor(item, selectedModel)!} alt="" loading="lazy" />
            )}
            <span>
              <small>0{i + 1}</small>
              {item.title}
            </span>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
    </nav>
  )
}

function ArtworkReveal({ design, selectedModel, mobile }: ExperienceProps & { mobile?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (!mobile && !reduced) setActive(value > 0.67 ? 2 : value > 0.3 ? 1 : 0)
  })
  const renders = rendersFor(design, selectedModel)
  const frames = [
    design.gallery[0] ?? renders.flat,
    renders.threeQuarter ?? renders.hero,
    design.gallery[1] ?? renders.flat,
  ]
  const stages = [
    [
      'The artwork',
      'Start with something you want to carry.',
      'The full composition, with every line and colour in view.',
    ],
    [
      'The case',
      'A new dimension to your everyday.',
      'See how the composition sits on the case, from the camera surround to the lower edge.',
    ],
    [
      'The details',
      'Get a little closer.',
      'A closer view of the artwork placement, camera openings, and contours.',
    ],
  ]
  return (
    <section
      id="turntable"
      ref={ref}
      className={`art-reveal ${mobile || reduced ? 'art-reveal-static' : ''}`}
      aria-label="Explore the design"
    >
      <div className="art-reveal-stage">
        <div
          className="art-reveal-image"
          style={{ backgroundColor: `${design.palette[0] ?? '#d4d0c5'}22` }}
        >
          {frames.map(
            (src, index) =>
              src && (
                <img
                  key={`${design.id}-${index}`}
                  className={`reveal-frame reveal-frame-${index}`}
                  data-active={active === index}
                  src={src}
                  alt={`${design.title} — ${stages[index][0].toLowerCase()}`}
                  aria-hidden={active !== index}
                  loading="lazy"
                />
              ),
          )}
          <span className="reveal-image-caption">
            {design.title} / 0{active + 1}
          </span>
        </div>
        <div className="art-reveal-copy">
          <span className="editorial-kicker">From an idea to your everyday</span>
          <h2>
            Art, in another
            <br />
            <em>dimension.</em>
          </h2>
          <div className="art-reveal-tabs" role="group" aria-label="Product views">
            {stages.map(([label], index) => (
              <button
                key={label}
                onClick={() => setActive(index)}
                type="button"
                aria-pressed={active === index}
              >
                <span>0{index + 1}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="reveal-text" aria-live="polite">
            <h3>{stages[active][1]}</h3>
            <p>{stages[active][2]}</p>
          </div>
          <p className="reveal-note">
            Design preview on our sample case. Camera openings and placement vary by phone model.
          </p>
          {!mobile && !reduced && (
            <span className="reveal-scroll">
              <ArrowDown size={15} /> Scroll to explore · or select a view
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function DesignStory({ design }: ExperienceProps) {
  return (
    <section className="design-story" id="details">
      <div>
        <span className="editorial-kicker">Behind the design / {design.title}</span>
        <h2>{design.tagline}</h2>
      </div>
      <div>
        <p>{storyText(design, 700)}</p>
        <div className="story-palette" aria-label="Design colours">
          {design.palette.map((color) => (
            <span key={color} style={{ backgroundColor: color }} title={color} />
          ))}
          <span className="palette-label">The palette</span>
        </div>
        <dl>
          <div>
            <dt>Design</dt>
            <dd>{design.title}</dd>
          </div>
          <div>
            <dt>Made</dt>
            <dd>Printed to order</dd>
          </div>
          <div>
            <dt>Your rotation</dt>
            <dd>Any three designs for $50</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function DesignCollection(props: ExperienceProps) {
  const { catalog, design, selectedModel, switchDesign } = props
  return (
    <section className="design-collection" id="collection">
      <div className="collection-heading">
        <div>
          <span className="editorial-kicker">Room for another side of you</span>
          <h2>
            Meet your <em>next two.</em>
          </h2>
        </div>
        <p>
          Different designs. Same phone.
          <br />
          Build a three-case rotation for $50.
        </p>
      </div>
      <div className="collection-cards">
        {catalog.map((item, index) => (
          <button
            type="button"
            className="collection-card"
            key={item.id}
            aria-label={`Explore ${item.title}`}
            onClick={() => {
              switchDesign(item.slug)
              document
                .getElementById('build-your-three')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            <div
              className="collection-art"
              style={{ background: `${item.palette[0] ?? '#aaa'}33` }}
            >
              <span>0{index + 1}</span>
              {thumbImageFor(item, selectedModel) && (
                <img
                  src={thumbImageFor(item, selectedModel)!}
                  alt={`${item.title} case`}
                  loading="lazy"
                />
              )}
              <span className="collection-card-action">
                {design.id === item.id ? 'On your screen' : 'Explore design'}{' '}
                <ArrowRight size={18} />
              </span>
            </div>
            <div className="collection-card-title">
              <h3>{item.title}</h3>
              <span>{formatPrice(item.price)} individually</span>
            </div>
            <p>{item.tagline}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

const questions = [
  [
    'How does three for $50 work?',
    'Choose any three cases and the $50 set price applies automatically in your bag. Mix designs, repeat a favourite, or choose different phones for a gift. Every complete set of three receives the offer. Shipping and tax are separate.',
  ],
  [
    'Can I order just one case?',
    'Yes. Every design is available individually at the price shown. You can add more designs later while you shop; the offer applies as soon as your bag contains a complete set of three.',
  ],
  [
    'Can I mix phone models in my three?',
    'Yes. Choose a phone before adding each case. Each selection keeps its own model, so you can build a set for yourself and someone else. Check the model listed beneath each design in your bag.',
  ],
  [
    'Will the design look the same on every phone?',
    'Each phone has different dimensions and camera openings, so placement changes with the model. The current preview uses our sample case to show the design. Final model-specific previews and print coverage will be confirmed before ordering opens.',
  ],
  [
    'When will ordering open?',
    'We are preparing the first collection. For now, explore the designs, build your three, and review your selection. Payment is not open yet; delivery dates will be available when ordering opens.',
  ],
]

export function DesignLanding(props: ExperienceProps & { mobile?: boolean }) {
  return (
    <>
      <DesignRail {...props} />
      <BundleBuilder {...props} />
      <ArtworkReveal key={props.design.id} {...props} />
      <DesignStory {...props} />
      <section className="ordering-story" id="how-it-works">
        <span className="editorial-kicker">Make it yours</span>
        <h2>
          Good design.
          <br />
          <em>Easy decisions.</em>
        </h2>
        <div>
          {[
            [
              'Choose your phone.',
              'Find your model once. We remember it as you move between designs.',
            ],
            [
              'Find your three.',
              'Mix a bold statement, a little detail, and a quieter day. Or pick three favourites.',
            ],
            [
              'Make room for change.',
              'Review every design and phone model together. Your $50 set price applies automatically.',
            ],
          ].map(([title, copy], i) => (
            <article key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <DesignCollection {...props} />
      <section className="store-faq" id="questions">
        <div>
          <span className="editorial-kicker">A few things to know</span>
          <h2>
            Before you
            <br />
            <em>make it yours.</em>
          </h2>
        </div>
        <div>
          {questions.map(([q, answer]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={19} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <footer className="store-footer">
        <span className="editorial-kicker">Your phone. Your point of view.</span>
        <h2>
          Why settle
          <br />
          for <em>one mood?</em>
        </h2>
        <a className="store-cta" href="#build-your-three">
          Build your three · $50 <ArrowRight size={18} />
        </a>
        <div>
          <a href="#collection">Explore the collection</a>
          <a href="#questions">Questions & answers</a>
          <span>Printed to order · Designed to be carried</span>
        </div>
      </footer>
    </>
  )
}
