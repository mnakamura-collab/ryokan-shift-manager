import { useState } from 'react';
import type { Staff, Reservation, ReservationReview } from '../types';
import { reservationStorage, shiftStorage } from '../utils/storage';
import { formatDateJP } from '../utils/helpers';

interface ReservationReviewProps {
  currentUser: Staff;
  reservations: Reservation[];
  onUpdate: () => void;
}

export default function ReservationReview({ currentUser, reservations, onUpdate }: ReservationReviewProps) {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reviewForm, setReviewForm] = useState({
    staffingLevel: 'adequate' as 'insufficient' | 'adequate' | 'excessive',
    actualStaffCount: 0,
    notes: '',
  });

  // レビュー対象（過去の予約で未レビュー）
  const today = new Date().toISOString().split('T')[0];
  const pastReservations = reservations
    .filter((r) => r.checkOutDate < today && !r.review)
    .sort((a, b) => new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime());

  // レビュー済み
  const reviewedReservations = reservations
    .filter((r) => r.review)
    .sort((a, b) => new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime());

  const handleStartReview = (reservation: Reservation) => {
    // その日の実際のスタッフ数を計算
    const checkInShifts = shiftStorage.getByDate(reservation.checkInDate);
    const actualCount = new Set(checkInShifts.map((s) => s.staffId)).size;

    setSelectedReservation(reservation);
    setReviewForm({
      staffingLevel: 'adequate',
      actualStaffCount: actualCount,
      notes: '',
    });
  };

  const handleSubmitReview = () => {
    if (!selectedReservation) return;

    const review: ReservationReview = {
      staffingLevel: reviewForm.staffingLevel,
      actualStaffCount: reviewForm.actualStaffCount,
      reviewDate: new Date().toISOString(),
      notes: reviewForm.notes,
    };

    reservationStorage.update(selectedReservation.id, { review });
    onUpdate();
    setSelectedReservation(null);
  };

  const getStaffingRecommendation = (plan: string, numberOfGuests: number): number => {
    // レビュー済みデータから学習
    const similarReviews = reviewedReservations.filter(
      (r) => r.plan === plan && Math.abs(r.numberOfGuests - numberOfGuests) <= 2
    );

    if (similarReviews.length === 0) {
      // デフォルトの推奨値
      if (plan === 'VIP') return Math.max(6, Math.ceil(numberOfGuests / 2));
      if (plan.includes('プレミアム')) return Math.max(5, Math.ceil(numberOfGuests / 3));
      if (plan.includes('デラックス')) return Math.max(4, Math.ceil(numberOfGuests / 4));
      return Math.max(3, Math.ceil(numberOfGuests / 5));
    }

    // レビューデータに基づいて調整
    const adequateReviews = similarReviews.filter((r) => r.review?.staffingLevel === 'adequate');
    const insufficientReviews = similarReviews.filter((r) => r.review?.staffingLevel === 'insufficient');
    const excessiveReviews = similarReviews.filter((r) => r.review?.staffingLevel === 'excessive');

    if (adequateReviews.length > 0) {
      // 適正だったケースの平均
      const avgAdequate =
        adequateReviews.reduce((sum, r) => sum + (r.review?.actualStaffCount || 0), 0) / adequateReviews.length;
      return Math.round(avgAdequate);
    }

    if (insufficientReviews.length > 0) {
      // 不足だったケースは+1
      const avgInsufficient =
        insufficientReviews.reduce((sum, r) => sum + (r.review?.actualStaffCount || 0), 0) / insufficientReviews.length;
      return Math.round(avgInsufficient) + 1;
    }

    if (excessiveReviews.length > 0) {
      // 過剰だったケースは-1
      const avgExcessive =
        excessiveReviews.reduce((sum, r) => sum + (r.review?.actualStaffCount || 0), 0) / excessiveReviews.length;
      return Math.max(1, Math.round(avgExcessive) - 1);
    }

    return 3;
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-8">予約レビューは管理者のみアクセスできます</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">予約レビュー</h2>
        <p className="text-sm text-gray-600 mb-6">
          過去の予約の人員配置を振り返り、次回のシフト作成に活かします
        </p>

        {/* 未レビューの予約 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">レビュー待ち</h3>
          {pastReservations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">レビュー待ちの予約はありません</p>
          ) : (
            <div className="space-y-3">
              {pastReservations.map((reservation) => (
                <div key={reservation.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800">{reservation.guestName}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>
                        {formatDateJP(reservation.checkInDate)} - {formatDateJP(reservation.checkOutDate)}
                      </p>
                      <p>
                        {reservation.numberOfGuests}名 | {reservation.plan} | 配置スタッフ: {reservation.requiredStaff}名
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleStartReview(reservation)} className="btn btn-primary text-sm">
                    レビュー
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* レビュー済みの予約 */}
        {reviewedReservations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">レビュー済み</h3>
            <div className="space-y-3">
              {reviewedReservations.slice(0, 10).map((reservation) => {
                const review = reservation.review!;
                const levelText =
                  review.staffingLevel === 'insufficient' ? '不足' : review.staffingLevel === 'adequate' ? '適正' : '過剰';
                const levelColor =
                  review.staffingLevel === 'insufficient'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : review.staffingLevel === 'adequate'
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-300';

                return (
                  <div key={reservation.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{reservation.guestName}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>
                            {formatDateJP(reservation.checkInDate)} - {formatDateJP(reservation.checkOutDate)}
                          </p>
                          <p>
                            {reservation.numberOfGuests}名 | {reservation.plan}
                          </p>
                          <p className="mt-1">
                            配置: {reservation.requiredStaff}名 → 実際: {review.actualStaffCount}名
                          </p>
                          {review.notes && <p className="text-gray-500 mt-1">メモ: {review.notes}</p>}
                        </div>
                      </div>
                      <span className={`badge ${levelColor} text-xs`}>{levelText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* レビューモーダル */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-800">予約レビュー</h3>

            <div className="mb-4 bg-gray-50 rounded p-3">
              <p className="font-semibold text-gray-800">{selectedReservation.guestName}</p>
              <p className="text-sm text-gray-600">
                {formatDateJP(selectedReservation.checkInDate)} - {formatDateJP(selectedReservation.checkOutDate)}
              </p>
              <p className="text-sm text-gray-600">
                {selectedReservation.numberOfGuests}名 | {selectedReservation.plan}
              </p>
              <p className="text-sm text-gray-600 mt-1">予定スタッフ数: {selectedReservation.requiredStaff}名</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">実際のスタッフ数</label>
                <input
                  type="number"
                  min="0"
                  value={reviewForm.actualStaffCount}
                  onChange={(e) => setReviewForm({ ...reviewForm, actualStaffCount: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">人員配置の評価</label>
                <div className="space-y-2">
                  {[
                    { value: 'insufficient', label: '不足（もっと必要だった）', color: 'border-red-300' },
                    { value: 'adequate', label: '適正（ちょうど良かった）', color: 'border-green-300' },
                    { value: 'excessive', label: '過剰（多すぎた）', color: 'border-yellow-300' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 border-2 rounded cursor-pointer transition-colors ${
                        reviewForm.staffingLevel === option.value
                          ? `${option.color} bg-opacity-10`
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="staffingLevel"
                        value={option.value}
                        checked={reviewForm.staffingLevel === option.value}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            staffingLevel: e.target.value as 'insufficient' | 'adequate' | 'excessive',
                          })
                        }
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-800">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ（オプション）</label>
                <textarea
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                  className="input w-full h-20"
                  placeholder="特記事項があれば記入してください"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReservation(null)}
                  className="btn btn-secondary flex-1"
                >
                  キャンセル
                </button>
                <button type="button" onClick={handleSubmitReview} className="btn btn-primary flex-1">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
