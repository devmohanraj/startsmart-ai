package com.startsmart.ai.riskanalyzer.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LlmMarketResponseDTO {

    private MarketData marketData;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MarketData {
        @JsonProperty("marketSizeTam")
        private BigDecimal marketSizeTam;

        @JsonProperty("marketSizeSam")
        private BigDecimal marketSizeSam;

        @JsonProperty("marketSizeSom")
        private BigDecimal marketSizeSom;

        private String growthRate;

        private List<MarketTrend> marketTrends;

        private List<CompetitorData> competitors;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MarketTrend {
        private int year;
        private BigDecimal value;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CompetitorData {
        private String name;
        private String marketShare;
        private String revenue;
        private String growth;
        private String position;
    }
}
