import React, { useCallback, useEffect, useRef, useState } from "react";
import { getAnalytics, getDishPerformance } from "../API/analytics.js";

// Import analytics components
import AnalyticsControlBar from "../components/analytics/AnalyticsControlBar";
import KPICards from "../components/analytics/KPICards";
import SalesTrendChart from "../components/analytics/SalesTrendChart";
import HourlyTrafficChart from "../components/analytics/HourlyTrafficChart";
import CategoryPerformanceWidget from "../components/analytics/CategoryPerformanceWidget";
import OrderSizeBehavior from "../components/analytics/OrderSizeBehavior";
import DishPerformanceTable from "../components/analytics/DishPerformanceTable";
import CategoryModal from "../components/analytics/CategoryModal";
import DishModal from "../components/analytics/DishModal";

function createInitialAnalyticsState() {
  return {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    averageOrderPerDay: 0,
    avgItemsPerOrder: 0,
    salesTrend: [],
    hourlyTrafficAvg: [],
    categoryPerformance: [],
    orderSize: [],
  };
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [dishFilter, setDishFilter] = useState("revenue"); // 'revenue', 'quantity'
  const [dateSelection, setDateSelection] = useState({ start: null, end: null });
  
  // Modal States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDishModal, setShowDishModal] = useState(false);

  const [data, setData] = useState(createInitialAnalyticsState);

  const [dishData, setDishData] = useState([]);
  const analyticsRequestRef = useRef(0);
  const dishRequestRef = useRef(0);

  const isCustomRangeIncomplete =
    dateRange === "Custom Range" && (!dateSelection.start || !dateSelection.end);

  const fetchData = useCallback(async () => {
    if (isCustomRangeIncomplete) {
      return;
    }

    const requestId = ++analyticsRequestRef.current;

    try {
      setData(createInitialAnalyticsState());

      let result;
      if (dateRange === "Custom Range") {
        result = await getAnalytics({
          start: dateSelection.start,
          end: dateSelection.end,
        });
      } else {
        result = await getAnalytics(dateRange);
      }

      if (requestId !== analyticsRequestRef.current || !result) {
        return;
      }

      console.log("Fetched analytics data:", result);

      setData({
        totalRevenue: result.totalRevenue ?? 0,
        totalOrders: result.totalOrders ?? 0,
        averageOrderValue: result.avgOrderValue ?? 0,
        averageOrderPerDay: result.avgOrdersPerDay ?? 0,
        avgItemsPerOrder: result.avgNumberOfItemsPerOrder ?? 0,
        salesTrend: result.salesTrendData ?? [],
        hourlyTrafficAvg: result.hourlyRushData ?? [],
        categoryPerformance: result.categoryPerformanceData ?? [],
        orderSize: result.orderSizeData ?? [],
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    }
  }, [dateRange, dateSelection, isCustomRangeIncomplete]);

  useEffect(() => {
    if (isCustomRangeIncomplete) {
      setDishData([]);
      return;
    }

    let isActive = true;
    const requestId = ++dishRequestRef.current;

    (async () => {
      setDishData([]);

      try {
        let result;
        if (dateRange === "Custom Range") {
          result = await getDishPerformance(
            { start: dateSelection.start, end: dateSelection.end },
            dishFilter,
            100
          );
        } else {
          result = await getDishPerformance(dateRange, dishFilter, 100);
        }

        if (!isActive || requestId !== dishRequestRef.current) {
          return;
        }

        setDishData(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Error fetching dish performance data:", error);
        if (isActive && requestId === dishRequestRef.current) {
          setDishData([]);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [dishFilter, dateRange, dateSelection, isCustomRangeIncomplete]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (showCategoryModal || showDishModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showCategoryModal, showDishModal]);

  return (
    <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* --- CONTROL BAR --- */}
        <AnalyticsControlBar 
          dateRange={dateRange}
          setDateRange={setDateRange}
          dateSelection={dateSelection}
          setDateSelection={setDateSelection}
          onApply={fetchData}
        />

        {/* --- KPI CARDS --- */}
        <KPICards data={data} />

        {/* --- TREND CHART --- */}
        <SalesTrendChart data={data.salesTrend} />

        {/* --- SPLIT ROW 1: Hourly & Category --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <HourlyTrafficChart data={data.hourlyTrafficAvg} />
          <CategoryPerformanceWidget 
            data={data.categoryPerformance} 
            onViewAll={() => setShowCategoryModal(true)}
          />
        </div>

        {/* --- SPLIT ROW 2: Order Size & Dish Details --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <OrderSizeBehavior data={data.orderSize} />
          <DishPerformanceTable 
            dishData={dishData}
            dishFilter={dishFilter}
            setDishFilter={setDishFilter}
            onViewAll={() => setShowDishModal(true)}
          />
        </div>

      </div>

      <CategoryModal 
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        range={dateRange !== "Custom Range" ? dateRange : dateSelection}
      />

      <DishModal 
        isOpen={showDishModal}
        onClose={() => setShowDishModal(false)}
        dishFilter={dishFilter}
        range={dateRange !== "Custom Range" ? dateRange : dateSelection}
      />

    </div>
  );
}