import React from 'react';
import { ArrowRight, BookOpen, Clock3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicPageShell from './PublicPageShell';
import { useTranslation } from '../lib/i18n';

const POSTS = [
  ['what-is-smm-panel','What Is an SMM Panel? A Beginner’s Guide','A clear introduction to SMM panels, how orders work, and what to check before choosing a provider.'],
  ['best-smm-panel-guide','How to Choose the Best SMM Panel','Learn the key factors: service quality, pricing, speed, support, API and reliability.'],
  ['smm-reseller-guide','SMM Reseller Guide: Start Your Own Service Business','A practical overview of reseller workflows, margins, service catalogs and automation.'],
  ['instagram-growth-strategy','Instagram Growth Strategy','Understand the main growth levers for Instagram and how to organize campaigns.'],
  ['tiktok-marketing-smm','TikTok Marketing with SMM Services','A beginner-friendly look at TikTok marketing, engagement and service selection.'],
  ['youtube-smm-marketing','YouTube Marketing and SMM','How views, subscribers and engagement services fit into a broader YouTube strategy.'],
  ['telegram-smm-marketing','Telegram SMM Marketing','Ways to structure Telegram growth campaigns while keeping orders organized.'],
  ['smm-api-guide','SMM API Guide for Resellers','Understand API-based ordering, service IDs, balances and automation basics.'],
  ['smm-pricing-profit','SMM Pricing and Profit','How service cost, selling price and margin work together in an SMM business.'],
  ['smm-panel-security','SMM Panel Security Checklist','The essential security areas for accounts, payments, APIs and provider credentials.'],
  ['smm-order-management','SMM Order Management','A simple system for tracking new, processing, completed, canceled and refill orders.'],
  ['common-smm-panel-mistakes','Common SMM Panel Mistakes','Avoid common setup, pricing, service-quality and customer-support mistakes.'],
];

export default function BlogPage(){
  const { dir } = useTranslation();
  const ar = dir === 'rtl';
  return <PublicPageShell>
    <div className="blog-page" dir={dir}>
      <section className="blog-hero">
        <div className="blog-hero-kicker"><Sparkles size={14}/> {ar ? 'مركز المعرفة' : 'KNOWLEDGE HUB'}</div>
        <h1>{ar ? 'دليل RapidSMM للنمو والتسويق الرقمي' : 'The RapidSMM guide to social growth'}</h1>
        <p>{ar ? 'مقالات عملية تساعدك تفهم خدمات SMM، إدارة الطلبات، الـAPI، التسعير والنمو بدون تعقيد.' : 'Practical guides to SMM services, order management, APIs, pricing and social growth — without the jargon.'}</p>
      </section>
      <div className="blog-grid">
        {POSTS.map(([slug,title,desc],i)=><article className="blog-card" key={slug}>
          <div className="blog-card-icon"><BookOpen size={19}/></div>
          <div className="blog-card-top"><span>{ar ? 'مقال' : 'GUIDE'}</span><span><Clock3 size={13}/> {ar ? 'قراءة 4 دقائق' : '4 min read'}</span></div>
          <h2>{title}</h2><p>{desc}</p>
          <a className="blog-read" href={`/blog/${slug}.html`}>{ar ? 'اقرأ المقال' : 'Read article'} <ArrowRight size={15}/></a>
        </article>)}
      </div>
      <section className="blog-cta">
        <div><b>{ar ? 'جاهز تبدأ؟' : 'Ready to get started?'}</b><p>{ar ? 'استكشف الخدمات أو أنشئ حسابك وابدأ أول طلب.' : 'Explore the catalog or create your account and place your first order.'}</p></div>
        <Link to="/services" className="rapid-public-cta">{ar ? 'استكشف الخدمات' : 'Explore services'} <ArrowRight size={15}/></Link>
      </section>
    </div>
  </PublicPageShell>;
}
