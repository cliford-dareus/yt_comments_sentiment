"use client";

import Papa from "papaparse";
import { useEffect, useState } from "react";

type Props = {
  file: string | undefined;
};

const CsvComponent = ({ file }: Props) => {
  const [parseData, setParsedData] = useState();
  //State to store table Column name
  const [tableRows, setTableRows] = useState([]);
  //State to store the values
  const [values, setValues] = useState<string[][]>([]);

  useEffect(() => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      download: true,
      complete: function (results) {
        const rowsArray: any = [];
        const valuesArray: any = [];

        results.data.map((d: any) => {
          const value = Object.values(d);
          const keys = Object.keys(d);
          rowsArray.push(keys);
          valuesArray.push(value);
        });

        setTableRows(rowsArray[0]);
        setValues(valuesArray);
      },
    });
  }, []);

  return (
    <div>
      <table>
        <thead>
          <tr>
            {tableRows.map((rows, index) => {
              return <th key={index}>{rows}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {values.map((value, index) => {
            return (
              <tr key={index} className="">
                {value.map((val, i) => {
                  return (
                    <td className="p-2 border" key={i}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CsvComponent;
