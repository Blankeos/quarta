// use std::collections::HashMap;

use rowboat::dataframe::{Dataframe, ToRow};
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

#[wasm_bindgen]
pub fn parse_csv(csv: &str) -> Option<std::string::String> {
    use csv::ReaderBuilder;
    use rowboat::dataframe::*;

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

    #[derive(ToRow, Debug, serde::Serialize, Clone)]
    struct CsvRow {
        date: String,
        transaction: String,
        amount: f32,
        tags: Option<String>,
        id: Option<String>,
        remarks: Option<String>,
    }

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
                    tags: record.get(tags_idx).map(|x| Some(x.to_string())).unwrap(),
                    id: record.get(id_idx).map(|x| Some(x.to_string())).unwrap(),
                    remarks: record
                        .get(remarks_idx)
                        .map(|x| Some(x.to_string()))
                        .unwrap(),
                };
                records.push(row);
            }
            Err(_) => continue,
        }
    }

    // let df = Dataframe::from_structs(records).unwrap();

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
