// Prompt suggestions based on industry/business type
// This will be enhanced with AI in Phase 7

export function generatePromptSuggestions(clientUrl: string, brandName: string): string[] {
  // Default prompts that work for any business
  const defaultPrompts = [
    `What is ${brandName}?`,
    `Tell me about ${brandName}`,
    `How does ${brandName} work?`,
    `What are the features of ${brandName}?`,
    `Is ${brandName} good?`,
    `${brandName} vs competitors`,
    `${brandName} pricing`,
    `${brandName} reviews`,
    `Best alternatives to ${brandName}`,
    `How to use ${brandName}?`,
  ];

  // Industry-specific prompts based on URL patterns
  const industryPrompts: Record<string, string[]> = {
    saas: [
      `Best SaaS tools for [use case]`,
      `${brandName} integration options`,
      `${brandName} API documentation`,
      `${brandName} free trial`,
    ],
    ecommerce: [
      `Where to buy from ${brandName}?`,
      `${brandName} shipping policy`,
      `${brandName} discount codes`,
      `${brandName} return policy`,
    ],
    agency: [
      `Best agencies for [service]`,
      `${brandName} portfolio`,
      `${brandName} case studies`,
      `${brandName} client testimonials`,
    ],
    consulting: [
      `Top consulting firms for [industry]`,
      `${brandName} expertise`,
      `${brandName} consulting services`,
      `How to hire ${brandName}`,
    ],
  };

  // Simple industry detection based on URL keywords
  const url = clientUrl.toLowerCase();
  let industryType = "default";

  if (url.includes("shop") || url.includes("store") || url.includes("buy")) {
    industryType = "ecommerce";
  } else if (url.includes("agency") || url.includes("studio")) {
    industryType = "agency";
  } else if (url.includes("consulting") || url.includes("advisor")) {
    industryType = "consulting";
  } else if (url.includes("app") || url.includes("software") || url.includes("saas")) {
    industryType = "saas";
  }

  const suggestions =
    industryType !== "default"
      ? [...defaultPrompts.slice(0, 6), ...industryPrompts[industryType]]
      : defaultPrompts;

  return suggestions.slice(0, 12); // Return max 12 suggestions
}

