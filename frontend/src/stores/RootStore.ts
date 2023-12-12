import AccountStore, { ISerializedAccountStore } from "@stores/AccountStore";
import SettingsStore, { ISerializedSettingStore } from "@stores/SettingsStore";
import NotificationStore from "@stores/NotificationStore";
import { makeAutoObservable } from "mobx";
import OrdersStore from "@stores/OrdersStore";
import OracleStore from "@stores/OracleStore";
import TradeStore, { ISerializedTradeStore } from "@stores/TradeStore";

export interface ISerializedRootStore {
	accountStore?: ISerializedAccountStore;
	tradeStore?: ISerializedTradeStore;
	settingStore?: ISerializedSettingStore;
}

export default class RootStore {
	public accountStore: AccountStore;
	public oracleStore: OracleStore;
	public settingsStore: SettingsStore;
	public notificationStore: NotificationStore;
	public ordersStore: OrdersStore;
	public tradeStore: TradeStore;

	constructor(initState?: ISerializedRootStore) {
		this.accountStore = new AccountStore(this, initState?.accountStore);
		this.ordersStore = new OrdersStore(this);
		this.settingsStore = new SettingsStore(this, initState?.settingStore);
		this.notificationStore = new NotificationStore(this);
		this.oracleStore = new OracleStore(this);
		this.tradeStore = new TradeStore(this, initState?.tradeStore);
		makeAutoObservable(this);
	}

	get initialized() {
		return this.accountStore.provider != null;
	}

	serialize = (): ISerializedRootStore => ({
		accountStore: this.accountStore.serialize(),
		tradeStore: this.tradeStore.serialize(),
		settingStore: this.settingsStore.serialize(),
	});
}
