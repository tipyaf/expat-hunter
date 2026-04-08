import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { JobOfferCardSkeleton, JobOfferCardSkeletonList } from './job-offer-card-skeleton'

describe('JobOfferCardSkeleton', () => {
  // ORACLE: isLoading=true → 3 skeleton elements with pulse animation class
  it('renders a single skeleton with pulse animation', () => {
    render(<JobOfferCardSkeleton />)
    const skeleton = screen.getByTestId('job-offer-card-skeleton')
    expect(skeleton).toBeDefined()
    expect(skeleton.className).toContain('animate-pulse')
  })
})

describe('JobOfferCardSkeletonList', () => {
  it('renders 3 skeleton cards', () => {
    render(<JobOfferCardSkeletonList />)
    const skeletons = screen.getAllByTestId('job-offer-card-skeleton')
    expect(skeletons).toHaveLength(3)
  })
})
