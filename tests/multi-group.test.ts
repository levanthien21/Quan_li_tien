import Decimal from 'decimal.js';
import { DepositService, IDepositRepository } from '../src/services/deposit.service.js';
import { FeeRateService, IFeeRateRepository } from '../src/services/fee-rate.service.js';
import { BalanceService, IBalanceRepository } from '../src/services/balance.service.js';

describe('Multi-Group Data Isolation Tests (Bước 5)', () => {
  let depositService: DepositService;
  let groupFees: Map<string, Decimal>;
  let groupDepositRates: Map<string, Decimal>;

  const groupAId = BigInt(10001);
  const groupBId = BigInt(10002);
  const customerAId = BigInt(20001);
  const customerBId = BigInt(20002);
  const operatorId = BigInt(30001);

  beforeEach(() => {
    groupFees = new Map();
    groupFees.set(groupAId.toString(), new Decimal(5)); // Group A: Fee 5%
    groupFees.set(groupBId.toString(), new Decimal(3)); // Group B: Fee 3%

    groupDepositRates = new Map();
    groupDepositRates.set(groupAId.toString(), new Decimal(26859)); // Group A Rate
    groupDepositRates.set(groupBId.toString(), new Decimal(26900)); // Group B Rate

    const mockFeeRepo: IFeeRateRepository = {
      getCustomerFee: async () => null,
      getGroupDefaultFee: async (gId) => groupFees.get(gId.toString()) || new Decimal(0),
      getGroupDepositRate: async (gId) => groupDepositRates.get(gId.toString()) || new Decimal(26859),
      getGroupWithdrawalRate: async () => new Decimal(26309),
    };

    const mockBalanceRepo: IBalanceRepository = {
      getNetDepositUsdtSum: async () => new Decimal(0),
      getWithdrawalUsdtSum: async () => new Decimal(0),
      getAdjustmentUsdtSum: async () => new Decimal(0),
    };

    const mockDepositRepo: IDepositRepository = {
      createTransaction: async (tx) => ({ id: 'tx-mg-' + tx.groupId, createdAt: new Date() }),
      getCustomerName: async (cId) => `Customer ${cId}`,
      getRecentDeposits: async () => [],
    };

    const feeRateService = new FeeRateService(mockFeeRepo);
    const balanceService = new BalanceService(mockBalanceRepo);
    depositService = new DepositService(mockDepositRepo, feeRateService, balanceService);
  });

  test('Deposit 4,000,000 VND in Group A (5%, rate 26859) vs Group B (3%, rate 26900) yields distinct results', async () => {
    const resultA = await depositService.processDeposit({
      groupId: groupAId,
      customerId: customerAId,
      operatorId,
      amountVnd: new Decimal(4000000),
    });

    const resultB = await depositService.processDeposit({
      groupId: groupBId,
      customerId: customerBId,
      operatorId,
      amountVnd: new Decimal(4000000),
    });

    // Group A: 4,000,000 * 0.95 = 3,800,000 VND -> 3,800,000 / 26,859 = 141.48 U
    expect(resultA.feePercent.toString()).toBe('5');
    expect(resultA.netAmountVnd.toString()).toBe('3800000');
    expect(resultA.amountUsdt.toFixed(2)).toBe('141.48');

    // Group B: 4,000,000 * 0.97 = 3,880,000 VND -> 3,880,000 / 26,900 = 144.24 U
    expect(resultB.feePercent.toString()).toBe('3');
    expect(resultB.netAmountVnd.toString()).toBe('3880000');
    expect(resultB.amountUsdt.toFixed(2)).toBe('144.24');

    // The two groups yield completely isolated, different results
    expect(resultA.amountUsdt.toFixed(2)).not.toBe(resultB.amountUsdt.toFixed(2));
  });
});
