import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Star, X, Check, ThumbsUp, Sparkles } from 'lucide-react';

interface RatingModalProps {
  orderId: string;
  onClose: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ orderId, onClose }) => {
  const { orders, language, rateOrder } = useApp();
  const isAr = language === 'ar';

  const order = orders.find((o) => o.id === orderId);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    isAr ? 'سرعة فائقة' : 'Ultra Fast',
    isAr ? 'جودة أصلية' : 'Real Quality'
  ]);

  if (!order) return null;

  const availableTags = isAr
    ? ['سرعة فائقة', 'جودة أصلية', 'دعم فني متجاوب', 'صعود إكسبلور', 'بدون أي نقص', 'سعر ممتاز']
    : ['Ultra Fast', 'Real Quality', 'Responsive Support', 'Explore Booster', 'Zero Drop', 'Great Price'];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalComment = comment.trim()
      ? comment
      : isAr
      ? `خدمة رائعة جداً وسريعة. التقييم: ${rating} نجوم!`
      : `Awesome and super fast service. Rated ${rating} stars!`;

    rateOrder(order.id, rating, finalComment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                {isAr ? 'تقييم تجربة الشراء' : 'Rate Your Experience'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? `الطلب #${order.id} - ${order.serviceNameAr}` : `Order #${order.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          
          {/* Stars Picker */}
          <div className="text-center space-y-2">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'ما مدى رضاك عن سرعة وجودة التنفيذ؟' : 'How satisfied are you with speed & quality?'}
            </span>
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-slate-300 dark:text-slate-700 hover:scale-125 transition-transform focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="inline-block text-xs font-bold text-amber-500 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              {rating === 5
                ? isAr ? 'ممتاز جداً وسرعة خيالية 🚀' : 'Flawless & Insane Speed 🚀'
                : rating === 4
                ? isAr ? 'جيد جداً وراضٍ تماماً 👍' : 'Very Good & Satisfied 👍'
                : isAr ? 'متوسط / مقبول' : 'Average / Acceptable'}
            </span>
          </div>

          {/* Quick Impression Tags */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'أبرز ما أعجبك في الطلب:' : 'What stood out to you?'}
            </span>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'ملاحظاتك أو تعليقك (اختياري):' : 'Your Review Comment (Optional):'}
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب رأيك الصادق لمساعدة المشترين الآخرين وتطوير الخدمة...'
                  : 'Write your honest feedback to help other buyers...'
              }
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* CTA */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition-all"
            >
              {isAr ? 'نشر التقييم الآن ⭐' : 'Submit Review ⭐'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
