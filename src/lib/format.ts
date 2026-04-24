export function formatAr(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " Ar";
}
