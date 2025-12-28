import React from 'react';
import './Skeletons.css';

export const SkeletonDealCard: React.FC = () => (
    <div className="skeleton-card">
        <div className="skeleton-image" />
        <div className="skeleton-text line-1" />
        <div className="skeleton-text line-2" />
    </div>
);

export const SkeletonTariffTile: React.FC = () => (
    <div className="skeleton-tariff">
        <div className="skeleton-circle" />
        <div className="skeleton-content">
            <div className="skeleton-text line-1" />
            <div className="skeleton-text line-2" />
        </div>
        <div className="skeleton-price" />
    </div>
);

export const SkeletonHeader: React.FC = () => (
    <div className="skeleton-header">
        <div className="skeleton-title" />
        <div className="skeleton-subtitle" />
    </div>
);

export const SkeletonGrid: React.FC = () => (
    <div className="skeleton-container">
        <SkeletonHeader />
        <div className="skeleton-grid">
            <SkeletonDealCard />
            <SkeletonDealCard />
            <SkeletonDealCard />
            <SkeletonDealCard />
        </div>
    </div>
);

export const SkeletonCarousel: React.FC = () => (
    <div className="skeleton-container">
        <SkeletonHeader />
        <div className="skeleton-carousel">
            <SkeletonDealCard />
            <SkeletonDealCard />
            <SkeletonDealCard />
        </div>
    </div>
);

export const SkeletonTariffSection: React.FC = () => (
    <div className="skeleton-container">
        <SkeletonHeader />
        <div className="skeleton-list">
            <SkeletonTariffTile />
            <SkeletonTariffTile />
            <SkeletonTariffTile />
        </div>
    </div>
);

export const HomeFeedSkeleton: React.FC = () => (
    <div className="home-feed-skeleton">
        <SkeletonCarousel />
        <SkeletonGrid />
        <SkeletonTariffSection />
    </div>
);
