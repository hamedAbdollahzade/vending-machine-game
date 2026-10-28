import { GameNode } from '@/components/shared/GameNode.jsx';
/** @typedef {{nodes:object,actions:object}} RealIntroDialogProps */
/** Presents the RealIntroDialog view using plain models and semantic native elements.
 * @param {RealIntroDialogProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function RealIntroDialog({ nodes, actions }) {
  return (
    <>
      <GameNode
        as="dialog"
        id="real-intro"
        model={nodes['real-intro']}
        onClose={() => actions.close('real-intro')}
      >
        <img src="./robot/serious.webp" alt="" width="72" height="68" />
        <h2>{'بازی در دنیای واقعی'}</h2>
        <p>
          {
            'با روشن کردن این حالت، موقعیت گوشی شما (GPS) روی نقشهٔ بازی نمایش داده می‌شود. وقتی واقعاً به محل یک دستگاه روبات مارکت برسید، می‌توانید خرید کنید و ۲۰۰ امتیاز اضافه بگیرید.'
          }
        </p>
        <ul>
          <li>{'هنگام راه رفتن به خیابان و ماشین‌ها نگاه کنید، نه به صفحه.'}</li>
          <li>{'بچه‌ها فقط همراه یک بزرگ‌تر بازی کنند.'}</li>
          <li>{'هنگام رانندگی از این حالت استفاده نکنید؛ در سرعت بالا خرید غیرفعال می‌شود.'}</li>
          <li>{'موقعیت شما فقط روی همین گوشی می‌ماند و جایی ارسال نمی‌شود.'}</li>
        </ul>
        <div className="actions">
          <GameNode
            as="button"
            type="button"
            id="real-go"
            model={nodes['real-go']}
            onAction={() => actions.emit('real-go')}
          >
            {'قبول دارم، شروع کن'}
          </GameNode>
          <GameNode
            as="button"
            type="button"
            id="real-cancel"
            className="ghost"
            model={nodes['real-cancel']}
            onAction={() => actions.emit('real-cancel')}
          >
            {'انصراف'}
          </GameNode>
        </div>
      </GameNode>
    </>
  );
}
