// use std::collections::HashMap;

use std::collections::HashMap;

use chrono::Datelike;
use js_sys::Math::abs;
use rowboat::dataframe::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // The `console.log` is quite polymorphic, so we can bind it with multiple
    // signatures. Note that we need to use `js_name` to ensure we always call
    // `log` in JS.
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(a: u32);

    // Multiple arguments too!
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_many(a: &str, b: &str);
}

macro_rules! console_log {
    // Note that this is using the `log` function imported above during
    // `bare_bones`
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

pub fn add(left: u64, right: u64) -> u64 {
    console_log!("123");
    left + right
}

#[derive(ToRow, Debug, serde::Serialize, Clone)]
struct CsvRow {
    date: String,
    transaction: String,
    amount: f32,
    tags: Option<String>,
    id: Option<String>,
    remarks: Option<String>,
}

#[wasm_bindgen]
pub struct RustDataframe {
    df: Option<Dataframe>,
}
#[wasm_bindgen]
impl RustDataframe {
    #[wasm_bindgen(constructor)]
    pub fn new() -> RustDataframe {
        RustDataframe { df: None }
    }

    #[wasm_bindgen]
    pub fn parse_csv(&mut self, csv: &str) -> Option<std::string::String> {
        use csv::ReaderBuilder;

        let mut reader = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(csv.as_bytes());

        let headers = match reader.headers() {
            Ok(headers) => headers.clone(),
            Err(_) => return None,
        };

        let date_idx = headers
            .iter()
            .position(|x| x.to_lowercase() == "date")
            .expect("No 'Date' column in the sheet.");
        let transaction_idx = headers
            .iter()
            .position(|x| x.to_lowercase() == "transaction")
            .expect("No 'Transaction' column in the sheet.");
        let amount_idx = headers
            .iter()
            .position(|x| x.to_lowercase() == "amount")
            .expect("No 'Amount' column in the sheet.");
        let tags_idx = headers
            .iter()
            .position(|x| x.to_lowercase() == "tags")
            .expect("No 'Tags' column in the sheet.");
        let id_idx = headers
            .iter()
            .position(|x| x.to_lowercase() == "id")
            .expect("No 'ID' column in the sheet.");
        let remarks_idx = headers
            .iter()
            .position(|x| x.to_lowercase() == "remarks")
            .expect("No 'Remarks' column in the sheet.");

        let mut records: Vec<CsvRow> = Vec::new();
        for result in reader.records() {
            match result {
                Ok(record) => {
                    let amount = record
                        .get(amount_idx)
                        .unwrap()
                        .to_string()
                        .replace(&['₱', ','][..], "")
                        .parse::<f32>()
                        .unwrap_or(0.0);
                    let row: CsvRow = CsvRow {
                        date: record.get(date_idx).unwrap().to_string(),
                        transaction: record.get(transaction_idx).unwrap().to_string(),
                        amount,
                        tags: record
                            .get(tags_idx)
                            .map(|x| {
                                if x.is_empty() {
                                    None
                                } else {
                                    Some(x.to_string())
                                }
                            })
                            .unwrap(),
                        id: record
                            .get(id_idx)
                            .map(|x| {
                                if x.is_empty() {
                                    None
                                } else {
                                    Some(x.to_string())
                                }
                            })
                            .unwrap(),
                        remarks: record
                            .get(remarks_idx)
                            .map(|x| {
                                if x.is_empty() {
                                    None
                                } else {
                                    Some(x.to_string())
                                }
                            })
                            .unwrap(),
                    };
                    records.push(row);
                }
                Err(_) => continue,
            }
        }

        self.df = Some(Dataframe::from_structs(records.clone()).unwrap());
        // // // Serialize dataframe to an array of objects
        // let mut table: Vec<HashMap<String, String>> = Vec::new();

        // let (_, rows) = df.to_rows();
        // for cols in rows {
        //     let mut row_map = HashMap::new();
        //     for (i, cell) in cols.iter().enumerate() {
        //         row_map.insert(headers[i].to_string(), cell.as_string());
        //     }
        //     table.push(row_map);
        // }

        // Convert the table to JSON and return it
        // let json_str = serde_json::to_string(&table).expect("Table serialization failed");

        let json_str = serde_json::to_string(&records).expect("Record serialization failed");
        Some(json_str)
    }

    #[wasm_bindgen]
    pub fn get_total_earned_vs_spent(&mut self) -> GetTotalEarnedVsSpent {
        let mut total_earned = 0.0;
        let mut total_spent = 0.0;

        if let Some(df) = self.df.as_ref() {
            for row in df.iter() {
                match row.get("amount").as_ref() {
                    Some(Cell::Float(amount)) => {
                        if *amount > 0.0 {
                            total_earned += amount;
                        } else {
                            total_spent += amount;
                        }
                    }
                    _ => {}
                };
            }
        }

        GetTotalEarnedVsSpent {
            total_earned,
            total_spent,
            net_income: total_earned + total_spent,
            lifetime_savings_decimal: (total_earned + total_spent) / total_earned,
        }
    }

    #[wasm_bindgen]
    pub fn search_debtors(&self, search_str: &str) -> Vec<SearchDebtors> {
        if let Some(df) = self.df.as_ref() {
            struct TempDebtorMapValue {
                balance: f64,
                direction: DebtDirection,
                related_rows: Option<Vec<String>>,
            }

            let mut debtors_map = HashMap::<String, TempDebtorMapValue>::new();
            let mut debtors_vec: Vec<SearchDebtors> = Vec::new();

            let debts_df = df
                .clone()
                .filter(exp("tags", Regex, "Debt(:In|:Out)?"))
                .unwrap();

            for row in debts_df.iter() {
                if let Some(Cell::Str(id)) = row.get("id") {
                    if id.to_lowercase().contains(&search_str.to_lowercase()) {
                        match row.get("amount").as_ref() {
                            Some(Cell::Float(amount)) => {
                                let debt_direction: DebtDirection = match row.get("tags").unwrap() {
                                    Cell::Str(v) => {
                                        if v.contains(":In") {
                                            DebtDirection::In
                                        } else {
                                            DebtDirection::Out
                                        }
                                    }
                                    _ => DebtDirection::Out,
                                };

                                debtors_map
                                    .entry(id.clone())
                                    .and_modify(|debt: &mut TempDebtorMapValue| {
                                        debt.balance += amount;
                                        if let Some(rows) = &mut debt.related_rows {
                                            rows.push(format!(
                                                "{}: {} PHP",
                                                row.get("date").unwrap().as_string(),
                                                row.get("amount").unwrap().as_string()
                                            ));
                                        }
                                    })
                                    .or_insert(TempDebtorMapValue {
                                        balance: *amount,
                                        direction: debt_direction,
                                        related_rows: Some(vec![format!(
                                            "{}: {} PHP",
                                            row.get("date").unwrap().as_string(),
                                            row.get("amount").unwrap().as_string()
                                        )]),
                                    });
                            }
                            _ => {}
                        }
                    }
                }
            }

            for (id, value) in debtors_map {
                let paid = if value.direction == DebtDirection::In {
                    value.balance <= 0.0
                } else {
                    value.balance >= 0.0
                };
                // console_log!("ID: {}, Balance: {}, Paid: {}", id, balance, paid);

                debtors_vec.push(SearchDebtors {
                    id: id.clone(),
                    balance: value.balance,
                    direction: value.direction,
                    paid,
                    related_rows: value.related_rows,
                })
            }

            return debtors_vec;
        }

        vec![]
    }

    #[wasm_bindgen]
    pub fn get_inflows_vs_outflows(&mut self) -> GetInflowsVsOutflows {
        let mut inflows: Vec<f64> = vec![0.0; 12];
        let mut outflows: Vec<f64> = vec![0.0; 12];
        let mut months: Vec<String> = Vec::new();

        #[derive(ToRow, Debug)]
        struct FilteredRow {
            pub amount: f64,
            pub date: String,
        }
        fn group_by_month_and_sum(filtered_rows: &Vec<FilteredRow>) -> HashMap<String, f64> {
            // GROUP BY
            let mut vals_by_month: HashMap<String, Vec<f64>> = HashMap::new(); // {"month.year": [num1, num2, ...] }

            for row in filtered_rows.iter() {
                if let Ok(datetime) = parse_datetime_any(&row.date) {
                    let year = datetime.year() as i64;
                    let month = datetime.month() as i64;

                    vals_by_month
                        .entry(format!("{}-{}", year, month))
                        .or_insert_with(Vec::new)
                        .push(row.amount);
                }
            }

            // SUM Reducer
            let mut date_sums: HashMap<String, f64> = HashMap::new(); // { "month.year": sum }

            for (key, values) in vals_by_month.iter() {
                let sum: f64 = values.iter().sum();
                date_sums.insert(key.clone(), sum);
            }

            date_sums
        }

        fn fill_missing_months_and_sort(
            inflows_map: &HashMap<String, f64>,
            outflows_map: &HashMap<String, f64>,
            months_range: &Vec<String>,
        ) -> (Vec<f64>, Vec<f64>) {
            let mut inflows_vec: Vec<f64> = Vec::new();
            let mut outflows_vec: Vec<f64> = Vec::new();

            for month_year in months_range.iter() {
                if let Some(val) = inflows_map.get(month_year.as_str()) {
                    inflows_vec.push(*val);
                } else {
                    inflows_vec.push(0.0);
                }

                if let Some(val) = outflows_map.get(month_year.as_str()) {
                    outflows_vec.push(*val);
                } else {
                    outflows_vec.push(0.0);
                }
            }

            (inflows_vec, outflows_vec)
        }

        if let Some(df) = self.df.as_ref() {
            let mut inflow_rows: Vec<FilteredRow> = Vec::new();
            let mut outflow_rows: Vec<FilteredRow> = Vec::new();

            for row in df.iter() {
                match row.get("amount").as_ref() {
                    Some(Cell::Float(amount)) => {
                        if *amount > 0.0 {
                            inflow_rows.push(FilteredRow {
                                amount: *amount,
                                date: row.get("date").unwrap().as_string(),
                            });
                        } else {
                            outflow_rows.push(FilteredRow {
                                amount: *amount,
                                date: row.get("date").unwrap().as_string(),
                            });
                        }
                    }
                    _ => {}
                }
            }

            let inflow_map = group_by_month_and_sum(&inflow_rows);
            let outflow_map = group_by_month_and_sum(&outflow_rows);

            let inflow_months: Vec<String> = inflow_map.keys().cloned().collect();
            let outflow_months: Vec<String> = outflow_map.keys().cloned().collect();

            let (min, max) = get_min_max_dates_from_lists(&inflow_months, &outflow_months);
            let months_range = get_months_str_by_range(min, max);

            (inflows, outflows) =
                fill_missing_months_and_sort(&inflow_map, &outflow_map, &months_range);

            months = months_range;
        }

        GetInflowsVsOutflows {
            inflows,
            outflows,
            months,
        }
    }
}

#[wasm_bindgen]
#[derive(serde::Serialize)]
pub struct GetInflowsVsOutflows {
    inflows: Vec<f64>,
    outflows: Vec<f64>,
    months: Vec<String>,
}

#[wasm_bindgen]
impl GetInflowsVsOutflows {
    #[wasm_bindgen(getter)]
    pub fn inflows(&self) -> js_sys::Float64Array {
        return js_sys::Float64Array::from(&self.inflows[..]);
    }
    #[wasm_bindgen(getter)]
    pub fn outflows(&self) -> js_sys::Float64Array {
        return js_sys::Float64Array::from(&self.outflows[..]);
    }
    #[wasm_bindgen(getter)]
    pub fn months(&self) -> js_sys::Array {
        let arr = js_sys::Array::new_with_length(self.months.len() as u32);
        for (i, m) in self.months.iter().enumerate() {
            arr.set(i as u32, JsValue::from_str(m));
        }
        arr
    }
}

fn get_min_max_dates_from_lists(
    list1: &Vec<String>,
    list2: &Vec<String>,
) -> (chrono::NaiveDate, chrono::NaiveDate) {
    let mut all_dates = Vec::new();

    // Combine both lists
    for date_str in list1.iter().chain(list2.iter()) {
        if let Some((year, month)) = date_str.split_once('-') {
            if let (Ok(y), Ok(m)) = (year.parse::<i32>(), month.parse::<u32>()) {
                if let Some(date) = chrono::NaiveDate::from_ymd_opt(y, m, 1) {
                    all_dates.push(date);
                }
            }
        }
    }

    // Find min and max
    let min_date = all_dates
        .iter()
        .min()
        .cloned()
        .unwrap_or_else(|| chrono::NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());
    let max_date = all_dates
        .iter()
        .max()
        .cloned()
        .unwrap_or_else(|| chrono::Local::now().naive_local().date());

    (min_date, max_date)
}

fn parse_datetime_any(
    datetime_str: &str,
) -> Result<chrono::DateTime<chrono::Utc>, chrono::format::ParseErrorKind> {
    // Try "January 2, 2024" format
    if let Ok(date) = chrono::NaiveDate::parse_from_str(datetime_str, "%B %d, %Y") {
        let dt = date.and_hms_opt(0, 0, 0).unwrap();
        return Ok(chrono::DateTime::from_naive_utc_and_offset(dt, chrono::Utc));
    }

    // Try "Wednesday, January 1, 2024" format
    if let Ok(date) = chrono::NaiveDate::parse_from_str(datetime_str, "%A, %B %d, %Y") {
        let dt = date.and_hms_opt(0, 0, 0).unwrap();
        return Ok(chrono::DateTime::from_naive_utc_and_offset(dt, chrono::Utc));
    }

    // Try RFC 3339 format
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(datetime_str) {
        return Ok(dt.to_utc());
    }

    // Try ISO 8601 format
    if let Ok(dt) = chrono::DateTime::parse_from_str(datetime_str, "%+") {
        return Ok(dt.to_utc());
    }

    // Add more format attempts if needed here

    // If no format worked, return an error
    Err(chrono::format::ParseErrorKind::Invalid)
}

fn get_months_str_by_range(start: chrono::NaiveDate, end: chrono::NaiveDate) -> Vec<String> {
    let mut current = start;
    let mut months = Vec::new();

    while current <= end {
        months.push(format!("{}-{}", current.year(), current.month()));
        current = if current.month() == 12 {
            chrono::NaiveDate::from_ymd_opt(current.year() + 1, 1, 1).unwrap()
        } else {
            chrono::NaiveDate::from_ymd_opt(current.year(), current.month() + 1, 1).unwrap()
        };
    }

    months
}

#[wasm_bindgen]
#[derive(serde::Serialize, Clone, Copy, PartialEq, Eq)]
pub enum DebtDirection {
    In = "In",
    Out = "Out",
}

#[wasm_bindgen]
#[derive(serde::Serialize)]
pub struct SearchDebtors {
    id: String,
    balance: f64,
    direction: DebtDirection,
    paid: bool,
    related_rows: Option<Vec<String>>,
}

#[wasm_bindgen]
impl SearchDebtors {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> f64 {
        self.balance
    }
    #[wasm_bindgen(getter)]
    pub fn paid(&self) -> bool {
        self.paid
    }
    #[wasm_bindgen(getter)]
    pub fn direction(&self) -> DebtDirection {
        self.direction
    }
    #[wasm_bindgen(getter)]
    pub fn related_rows(&self) -> Option<Vec<String>> {
        self.related_rows.clone()
    }
}

#[wasm_bindgen]
#[derive(serde::Serialize)]
pub struct GetTotalEarnedVsSpent {
    pub total_earned: f64,
    pub total_spent: f64,
    pub net_income: f64,
    pub lifetime_savings_decimal: f64,
}

// #[wasm_bindgen]
// fn get_total_income(df: Dataframe) {
//     df
// }
//
#[wasm_bindgen]
pub struct Counter {
    value: i32,
}

#[wasm_bindgen]
impl Counter {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Counter {
        Counter { value: 0 }
    }

    #[wasm_bindgen]
    pub fn increment(&mut self) -> i32 {
        self.value += 1;
        self.value
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
