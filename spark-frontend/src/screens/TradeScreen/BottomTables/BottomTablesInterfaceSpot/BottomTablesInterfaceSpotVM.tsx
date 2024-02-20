import React, { PropsWithChildren, useMemo } from "react";
import { ethers } from "ethers";
import { makeAutoObservable, reaction, when } from "mobx";

import { SPOT_MARKET_ABI } from "@src/abi";
import { CONTRACT_ADDRESSES, TOKENS_BY_ASSET_ID } from "@src/constants";
import { SpotMarketOrder, SpotMarketTrade } from "@src/entity";
import useVM from "@src/hooks/useVM";
import { fetchOrders, fetchTrades } from "@src/services/SpotMarketService";
import { handleEvmErrors } from "@src/utils/handleEvmErrors";
import { RootStore, useStores } from "@stores";

const ctx = React.createContext<BottomTablesInterfaceSpotVM | null>(null);

export const BottomTablesInterfaceSpotVMProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const rootStore = useStores();
  const store = useMemo(() => new BottomTablesInterfaceSpotVM(rootStore), [rootStore]);
  return <ctx.Provider value={store}>{children}</ctx.Provider>;
};

export const useBottomTablesInterfaceSpotVM = () => useVM(ctx);

class BottomTablesInterfaceSpotVM {
  myOrders: SpotMarketOrder[] = [];
  myOrdersHistory: SpotMarketTrade[] = [];
  initialized: boolean = false;

  isOrderCancelling = false;

  private readonly rootStore: RootStore;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
    when(
      () => !!this.rootStore.tradeStore.market,
      () => this.sync().then(() => this.setInitialized(true)),
    );
    setInterval(this.sync, 10000);
    reaction(() => this.rootStore.accountStore.address, this.sync);

    reaction(
      () => this.rootStore.accountStore.isConnected,
      (isConnected) => {
        if (!isConnected) {
          this.setMySpotOrders([]);
        }
      },
    );
  }

  cancelOrder = async (orderId: string) => {
    const { accountStore, notificationStore } = this.rootStore;

    if (!accountStore.signer || !this.rootStore.tradeStore.market) return;

    this.isOrderCancelling = true;

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.spotMarket, SPOT_MARKET_ABI, accountStore.signer);
      const transaction = await contract.removeOrder(orderId);
      await transaction.wait();
      notificationStore.toast("Order canceled!", { type: "success" });
    } catch (error) {
      handleEvmErrors(notificationStore, error, "We were unable to cancel your order at this time");
    }

    this.isOrderCancelling = false;
  };

  private sync = async () => {
    const { accountStore, tradeStore } = this.rootStore;

    if (!tradeStore.market || !accountStore.address) return;

    const { market } = tradeStore;

    try {
      const orders = await fetchOrders({
        baseToken: market.baseToken.assetId,
        limit: 100,
        trader: accountStore.address,
        isActive: true,
      });
      this.setMySpotOrders(orders);

      const ordersHistory = await fetchTrades(market.baseToken.assetId, 100, accountStore.address);

      const token = TOKENS_BY_ASSET_ID[market.baseToken.assetId];

      this.setMySpotOrdersHistory(
        ordersHistory.map((t) => new SpotMarketTrade({ ...t, baseToken: token, userAddress: accountStore.address! })),
      );
    } catch (error) {
      console.error(error);
    }
  };

  private setMySpotOrders = (myOrders: SpotMarketOrder[]) => (this.myOrders = myOrders);

  private setMySpotOrdersHistory = (myOrdersHistory: SpotMarketTrade[]) => (this.myOrdersHistory = myOrdersHistory);

  private setInitialized = (l: boolean) => (this.initialized = l);
}
