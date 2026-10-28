import { PaymentPanel } from './PaymentPanel.jsx';
import { MapDialog } from './MapDialog.jsx';
import { ShopDialog } from './ShopDialog.jsx';
import { RealIntroDialog } from './RealIntroDialog.jsx';
import { InstallDialog } from './InstallDialog.jsx';
import { UpdateNotice } from './UpdateNotice.jsx';
import { EndDialog } from './EndDialog.jsx';
/** Composes independently managed game dialogs. */
export function GameDialogs(props) {
  return (
    <>
      <PaymentPanel {...props} />
      <MapDialog {...props} />
      <ShopDialog {...props} />
      <RealIntroDialog {...props} />
      <InstallDialog {...props} />
      <UpdateNotice {...props} />
      <EndDialog {...props} />
    </>
  );
}
