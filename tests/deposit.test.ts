import Decimal from 'decimal.js';
import { DepositService, IDepositRepository } from '../src/services/deposit.service.js';
import { FeeRateService, IFeeRateRepository } from '../src/services/fee-rate.service.js';
import { BalanceService, IBalanceRepository } from '../src/services/balance.service.js';
import { TransactionType } from '../src/types/index.js';

describe('DepositService Tests (Required Test Cases 1 - 4)', () => {
  let depositService: DepositService;
  let mockFeeRepo: jest.Mocked<IFeeRateRepository>;
  let mockBalanceRepo: jest.Mocked<IBalanceRepository>;
  let mockDepositRepo: jest.Mocked<IDepositRepository>;

  const groupId = BigInt(1001);
  const customerId = BigInt(2002);
  const operatorId = BigInt(3003);

  beforeEach(() => {
    mockFeeRepo = {
      getCustomerFee: jest.fn().mockResolvedValue(null), // no custom customer fee
      getGroupDefaultFee: jest.fn().mockResolvedValue(new Decimal(5)), // 5%
      getGroupDepositRate: jest.fn().mockResolvedValue(new Decimal(26859)), // 26,859
      getGroupWithdrawalRate: jest.fn().mockResolvedValue(new Decimal(26309)),
    };

    mockBalanceRepo = {
      getNetDepositUsdtSum: jest.fn().mockResolvedValue(new Decimal(0)),
      getWithdrawalUsdtSum: jest.fn().mockResolvedValue(new Decimal(0)),
      getAdjustmentUsdtSum: jest.fn().mockResolvedValue(new Decimal(0)),
    };

    mockDepositRepo = {
      createTransaction: jest.fn().mockImplementation((tx) =>
        Promise.resolve({ id: 'tx-123', createdAt: new Date('2026-08-08T17:07:14Z') })
      ),
      getCustomerName: jest.fn().mockResolvedValue('Nguyễn Văn A'),
      getRecentDeposits: jest.fn().mockResolvedValue([]),
    };

    const feeRateService = new FeeRateService(mockFeeRepo);
    const balanceService = new BalanceService(mockBalanceRepo);
    depositService = new DepositService(mockDepositRepo, feeRateService, balanceService);
  });

  test('Case 1: Deposit 4,000,000 VND with 5% Fee and Rate 26,859 -> Net 3,800,000 VND, USDT ~ 141.48 U', async () => {
    const result = await depositService.processDeposit({
      groupId,
      customerId,
      operatorId,
      amountVnd: new Decimal(4000000),
    });

    expect(result.feeAmountVnd.toString()).toBe('200000');
    expect(result.netAmountVnd.toString()).toBe('3800000');
    // 3,800,000 / 26,859 = 141.479578... -> rounded to 2 decimal places display = 141.48
    expect(result.amountUsdt.toFixed(2)).toBe('141.48');
  });

  test('Case 2: Deposit 4,200,000 VND with 5% Fee and Rate 26,859 -> USDT ~ 148.55 U', async () => {
    const result = await depositService.processDeposit({
      groupId,
      customerId,
      operatorId,
      amountVnd: new Decimal(4200000),
    });

    // 4,200,000 * 0.95 = 3,990,000 VND
    // 3,990,000 / 26,859 = 148.553557... -> 148.55 U
    expect(result.netAmountVnd.toString()).toBe('3990000');
    expect(result.amountUsdt.toFixed(2)).toBe('148.55');
  });

  test('Case 3: Deposit 8,500,000 VND with 5% Fee and Rate 26,859 -> USDT ~ 300.64 U', async () => {
    const result = await depositService.processDeposit({
      groupId,
      customerId,
      operatorId,
      amountVnd: new Decimal(8500000),
    });

    // 8,500,000 * 0.95 = 8,075,000 VND
    // 8,075,000 / 26,859 = 300.644104... -> 300.64 U
    expect(result.netAmountVnd.toString()).toBe('8075000');
    expect(result.amountUsdt.toFixed(2)).toBe('300.64');
  });

  test('Case 4: Total Deposit 36,800,000 VND with 5% Fee -> Net 34,960,000 VND, USDT ~ 1,301.61 U', async () => {
    // 36,800,000 * 0.05 = 1,840,000 VND Fee
    // Net = 34,960,000 VND
    // 34,960,000 / 26,859 = 1301.61212... -> 1301.61 U
    const result = await depositService.processDeposit({
      groupId,
      customerId,
      operatorId,
      amountVnd: new Decimal(36800000),
    });

    expect(result.netAmountVnd.toString()).toBe('34960000');
    expect(result.amountUsdt.toFixed(2)).toBe('1301.61');
  });

  test('Negative Deposit (Adjustment): -4,000 VND with 5% Fee and Rate 26,859 -> type ADJUSTMENT', async () => {
    const result = await depositService.processDeposit({
      groupId,
      customerId,
      operatorId,
      amountVnd: new Decimal(-4000),
    });

    expect(mockDepositRepo.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADJUSTMENT',
        amountVnd: new Decimal(-4000),
      })
    );
    // -4000 * 0.95 = -3800 VND
    // -3800 / 26859 = -0.141479... -> -0.14 U
    expect(result.netAmountVnd.toString()).toBe('-3800');
    expect(result.amountUsdt.toFixed(2)).toBe('-0.14');
  });
});
