'use client';

import React, { useEffect, useRef, useState } from 'react';
import { drag, zoom } from 'd3';
import { select } from 'd3-selection';
import { geoPath, geoGraticule10 } from 'd3-geo';
// @ts-ignore
import { geoAitoff } from 'd3-geo-projection';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import parse from 'html-react-parser';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';

import { starData, lineData, constData, milkyData, starOption, constOption, colorPalette, sizePalette } from '@/data/starData';

const Skymap = () => {
  const router = useRouter();
  const svgRef = useRef(null);
  const searchParams = useSearchParams();
  const month = (new Date().getMonth() + 1) % 12;
  const date = new Date().getDate();
  const today_id = (month * 30 + date) % starOption.length;

  const [rotate, setRotate] = useState([0, -90]);
  const [scale, setScale] = useState(1);
  const [searched, setSearched] = useState(false);
  const [isStar, setIsStar] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [starMetaData, setStarMetaData] = useState<any>({});
  const [constMetaData, setConstMetaData] = useState<any>({});
  const [paragraphs, setParagraphs] = useState({ type: '', text: '' });
  const [mainParagraphs, setMainParagraphs] = useState([{ type: '', text: '' }]);
  const [searching, setSearching] = useState(false);
  const [renderedStarOptions, setRenderedStarOptions] = useState<any>([]);
  const [renderedConstOptions, setRenderedConstOptions] = useState<any>([]);

  useEffect(() => {
    let searchIndex = searchParams.get('display');
    let searchType = searchIndex ? searchIndex.split('-')[0] : null;

    if (searchType === 'star' && searchIndex) {
      setIsStar(true);
      fetch(`/api/star/${searchIndex}`)
        .then((res) => res.json())
        .then((data) => {
          setStarMetaData(data.star);
        });
    } else if (searchType === 'const' && searchIndex) {
      setIsStar(false);
      fetch(`/api/const/${searchIndex}`)
        .then((res) => res.json())
        .then((data) => {
          setConstMetaData(data.const);
        });
    } else {
      setSearched(false);
      setSearchValue('');
      setRotate([0, -90]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (starMetaData.lon) {
      fetch(`/api/document/${starMetaData.filename}`)
        .then((res) => res.json())
        .then((data) => {
          setParagraphs(data.document.paragraph[0]);
          setMainParagraphs(data.document.paragraph.slice(1));
          setSearchValue(starMetaData.display_name);
          setSearching(false);
          setSearched(true);
          setRotate([-parseFloat(starMetaData.lon), -parseFloat(starMetaData.lat)]);
          setScale(1);
        });
    }
  }, [starMetaData]);

  useEffect(() => {
    if (constMetaData.lon) {
      fetch(`/api/document/${constMetaData.filename}`)
        .then((res) => res.json())
        .then((data) => {
          setParagraphs(data.document.paragraph[0]);
          setMainParagraphs(data.document.paragraph.slice(1));
          setSearchValue(constMetaData.display_name);
          setSearching(false);
          setSearched(true);
          setRotate([-parseFloat(constMetaData.lon), -parseFloat(constMetaData.lat)]);
          setScale(1);
        });
    }
  }, [constMetaData]);

  useEffect(() => {
    const handleStarTagClick = (e: any) => {
      e.stopPropagation();
      setSearching(false);
      fetch(`/api/name/${e.target.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.star) {
            if (data.star.star_id) {
              setSearched(true);
              setIsStar(true);
              setStarMetaData(data.star);
              router.push(`/?display=${data.star.star_id}`);
            }
          } else if (data.const) {
            if (data.const.const_id) {
              setSearched(true);
              setIsStar(false);
              setConstMetaData(data.const);
              router.push(`/?display=${data.const.const_id}`);
            }
          } else {
            router.push(`/`);
            setSearched(false);
            setRotate([0, -90]);
            setScale(1);
          }
        });
    };
    document.querySelectorAll('.star-tag').forEach((item) => {
      item.addEventListener('click', handleStarTagClick);
    });

    return () => {
      document.querySelectorAll('.star-tag').forEach((item) => {
        item.removeEventListener('click', handleStarTagClick);
      });
    };
  }, [mainParagraphs]);

  // D3.js
  let rotate_d3 = [0, -90];
  const dragBehavior = drag<any, any>().on('drag', (event) => {
    const { dx, dy } = event;
    rotate_d3[0] += dx * 0.25;
    rotate_d3[1] -= dy * 0.25;
    setRotate([rotate_d3[0] + dx * 0.25, rotate_d3[1] - dy * 0.25]);
  });
  const dragNoBehavior = drag<any, any>().on('drag', () => { });

  const zoomBehavior = zoom<any, any>().on('zoom', (event) => {
    let scale_temp;
    if (event.transform.k < 0.16) scale_temp = 0.16;
    else scale_temp = event.transform.k;
    setScale(scale_temp);
  });
  const zoomNoBehavior = zoom<any, any>().on('zoom', () => { });

  useEffect(() => {
    let svg = select(svgRef.current);
    let projection = geoAitoff()
      .scale(650)
      .rotate([0, -90])
      .translate([window.innerWidth * 0.65, window.innerHeight * 0.5]);
    let pathGenerator = geoPath(projection);

    svg
      .append('defs')
      .append('path')
      .datum({ type: 'Sphere' })
      .attr('id', 'sphere')
      .attr('d', pathGenerator({ type: 'Sphere' }));
    svg.append('use').attr('class', 'stroke').attr('xlink:href', '#sphere');
    svg.append('path').datum(geoGraticule10()).attr('class', 'stroke').attr('d', pathGenerator).exit().remove();

    svg
      .selectAll('.milkyWay')
      .data(milkyData)
      .enter()
      .append('path')
      // @ts-ignore
      .attr('d', pathGenerator)
      .attr('class', 'milkyWay')
      .exit()
      .remove();
    // @ts-ignore
    svg
      .selectAll('.starline')
      .data(lineData)
      .enter()
      .append('path')
      // @ts-ignore
      .attr('d', pathGenerator)
      .attr('class', 'starLine')
      .attr('id', (d) => {
        return d.properties.line_id;
      })
      .exit()
      .remove();

    svg
      .selectAll('g')
      .data(starData)
      .enter()
      .append('g')
      .append('circle')
      .attr('cx', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0];
      })
      .attr('cy', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1];
      })
      .attr('r', 2)
      .attr('id', (d) => {
        return d.properties.id;
      })
      .style('fill', (d) => {
        return colorPalette[d.properties.color];
      })
      .exit()
      .remove();

    svg
      .selectAll('.starText')
      .data(starData)
      .enter()
      .append('text')
      .text((d) => {
        return d.properties.display_name;
      })
      // @ts-ignore
      .attr('d', pathGenerator)
      .attr('x', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 10;
      })
      .attr('y', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
      })
      .attr('id', (d) => {
        return d.properties.id;
      })
      .attr('name', (d) => {
        return d.properties.name;
      })
      .attr('class', 'starText')
      .exit()
      .remove();

    svg
      .selectAll('.constellation')
      .data(constData)
      .enter()
      .append('text')
      .text((d) => {
        return d.properties.display_name;
      })
      // @ts-ignore
      .attr('d', pathGenerator)
      .attr('x', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 15;
      })
      .attr('y', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
      })
      .attr('id', (d) => {
        return d.properties.id;
      })
      .attr('name', (d) => {
        return d.properties.name;
      })
      .style('fill', (d) => {
        return colorPalette['level' + d.properties.color];
      })
      .style('font-size', (d) => {
        return sizePalette['level' + d.properties.color];
      })
      .attr('class', 'constellation')
      .exit()
      .remove();

    svg.call(dragBehavior);
    svg.call(zoomBehavior);
  }, []);

  const updateCord = () => {
    let svg = select(svgRef.current);
    let scale_base = searched ? 1800 : 650;
    let projection = geoAitoff()
      .scale(scale * scale_base)
      .rotate(rotate)
      .translate([window.innerWidth * 0.65, window.innerHeight * 0.5]);
    svg.selectAll('path').attr('d', (d: any) => {
      return geoPath(projection)(d);
    });
    svg
      .selectAll('circle')
      .data(starData)
      .attr('cx', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0];
      })
      .attr('cy', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1];
      });
    svg
      .selectAll('.starText')
      .data(starData)
      .attr('x', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 10;
      })
      .attr('y', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
      });
    svg
      .selectAll('.constellation')
      .data(constData)
      .attr('x', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 15;
      })
      .attr('y', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
      });
  };

  useEffect(() => {
    if (isBrowsing) {
      setTimeout(() => {
        setRotate([rotate[0] + 0.75, rotate[1]]);
      }, 100);
    }
  });

  useEffect(() => {
    updateCord();
  }, [rotate, scale]);

  useEffect(() => {
    fetch(`/api/star/star-0001`);
    fetch(`/api/const/const-0001`);
    fetch(`/api/document/tongzhi_038_001`);

    if (isBrowsing) {
      setScale(0.65);
    } else {
      setScale(1);
    }

    const handleStarNameClick = (e: any) => {
      e.preventDefault();
      if (!isBrowsing) {
        router.push(`/?display=${e.target.id}`);
      }
    };

    document.querySelectorAll('.starText').forEach((item, i) => {
      item.addEventListener('click', handleStarNameClick);
    });
    document.querySelectorAll('.constellation').forEach((item, i) => {
      item.addEventListener('click', handleStarNameClick);
    });
    return () => {
      document.querySelectorAll('.starText').forEach((item, i) => {
        item.removeEventListener('click', handleStarNameClick);
      });
      document.querySelectorAll('.constellation').forEach((item, i) => {
        item.removeEventListener('click', handleStarNameClick);
      });
    };
  }, [isBrowsing]);

  const updateOptions = (targetName: string) => {
    let filteredStarOption = starOption.filter((option) => option.display_name.indexOf(targetName) > -1);
    let filteredConstOption = constOption.filter((option) => option.display_name.indexOf(targetName) > -1);
    setRenderedStarOptions(filteredStarOption);
    setRenderedConstOptions(filteredConstOption);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isBrowsing) {
      setSearchValue(e.target.value);
      if (e.target.value === '') {
        router.push(`/`);
        setRenderedStarOptions([]);
        setRenderedConstOptions([]);
        setSearching(false);
        setSearched(false);
        setRotate([0, -90]);
        setScale(1);
      } else {
        setSearching(true);
        updateOptions(e.target.value);
      }
    }
  };

  const getIdFromName = () => {
    if (searchValue === '')
      return [-1, 'not found'];
    for (let i = 0; i < starOption.length; i++) {
      if (String(starOption[i].display_name).indexOf(String(searchValue)) > -1) {
        return [starOption[i].id, 'star'];
      }
    }
    for (let i = 0; i < constOption.length; i++) {
      if (String(constOption[i].display_name).indexOf(String(searchValue)) > -1) {
        return [constOption[i].id, 'const'];
      }
    }
    return [-1, 'not found'];
  };

  const handleInputSubmit = () => {
    if (isBrowsing)
      return;
    const returnVal = getIdFromName();
    if (returnVal[0] === -1) return;
    else if (returnVal[1] === 'star') {
      router.push(`/?display=${returnVal[0]}`);
      setSearching(false);
    } else if (returnVal[1] === 'const') {
      router.push(`/?display=${returnVal[0]}`);
      setSearching(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleInputSubmit();
      setSearching(false);
    }
  };

  const handleInputFocus = (e: any) => {
    e.preventDefault();
    if (!isBrowsing) {
      if (e.target.value === '') {
        setSearching(false);
      } else {
        setSearching(true);
        updateOptions(e.target.value);
      }
    }
  };

  const handleDailyStarClick = (event: any) => {
    event.preventDefault();
    router.push(`/?display=${event.target?.id}`);
  };

  const handleStarOptionClick = (e: any) => {
    e.preventDefault();
    setSearching(false);
    let dest = e.target.id.split('?')[1];
    router.push(`/?display=${dest}`);
  };

  const handleBrowsingOptionClick = (e: any) => {
    let svg = select(svgRef.current);
    let browsing_temp = !isBrowsing;
    setIsBrowsing(browsing_temp);
    setSearching(false);
    if (browsing_temp) {
      svg.call(dragNoBehavior);
      svg.call(zoomNoBehavior);
    } else {
      svg.call(dragBehavior);
      svg.call(zoomBehavior);
    }
  };

  return (
    <div className='relative w-screen h-screen'>
      <svg
        ref={svgRef}
        style={{
          height: '100%',
          width: '100%',
          marginRight: '0px',
          marginLeft: '0px',
          backgroundColor: '#000000',
          // backgroundColor: '#111317',
        }}
      ></svg>

      <div className={`absolute top-0 left-0 w-[27.5rem] h-[100vh] bg-white ${searched ? 'block' : 'hidden'} max-md:hidden` }></div>

      <div className='absolute top-5 left-5 w-[26rem] mb-[0.5rem] z-50 max-md:hidden'>
        {/* Search Bar */}
        <div
          className={`z-40 w-[25rem] px-5 pt-[0.4rem] pb-[0.1rem] text-base rounded-t-lg bg-white drop-shadow-lg ${searching && (renderedStarOptions.length !== 0 || renderedConstOptions.length !== 0) ? 'border-b-4' : 'rounded-b-lg'
            }`}
        >
          <input
            type='text'
            placeholder='搜尋星名或星官'
            value={searchValue}
            className='focus:outline-0 w-[20rem]'
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={handleInputFocus}
            onMouseDown={e => { if (isBrowsing) e.preventDefault() }}
          // onBlur={handleInputBlur}
          />
          <IconButton onClick={handleInputSubmit}>
            <SearchIcon />
          </IconButton>
        </div>

        {/* Search Options */}
        <div className='z-30 w-[25rem] bg-white rounded-lg drop-shadow-lg max-h-[20rem]'>
          {searching ? (
            <>
              {renderedStarOptions.map((item: any, index: number) => {
                if (index < 3)
                  return (
                    <div
                      key={index}
                      id={`option?${item.id}`}
                      onClick={handleStarOptionClick}
                      className='z-20 w-[25rem] px-5 py-2 bg-white hover:bg-slate-100 hover:cursor-pointer last:pb-3 last:rounded-b-lg flex'
                    >
                      <div
                        id={`optionTag?${item.id}`}
                        className='w-[3rem] h-[1.5rem] ml-[1rem] py-[0.1rem] pl-1 pr-1 bg-slate-900 rounded-lg text-sm text-center text-slate-100'
                      >
                        星名
                      </div>
                      <div id={`optionName?${item.id}`} className='ml-[1rem] text-base flex-1'>
                        {item.display_name}
                      </div>
                      <div id={`optionField?${item.id}`} className='mr-[2rem] text-sm text-left flex-1 w-[5rem]'>
                        位於 {item.field}
                      </div>
                    </div>
                  );
              })}
              {renderedConstOptions.map((item: any, index: number) => {
                if (index < 3)
                  return (
                    <div
                      key={index}
                      id={`option?${item.id}`}
                      onClick={handleStarOptionClick}
                      className='z-20 w-[25rem] px-5 py-2 bg-white hover:bg-slate-100 hover:cursor-pointer last:pb-3 last:rounded-b-lg flex'
                    >
                      <div
                        id={`optionTag?${item.id}`}
                        className='w-[3rem] h-[1.5rem] ml-[1rem] py-[0.1rem] pl-1 pr-1 bg-slate-600 rounded-lg text-sm text-center text-slate-100'
                      >
                        星官
                      </div>
                      <div id={`optionName?${item.id}`} className='ml-[1rem] text-base flex-1'>
                        {item.display_name}
                      </div>
                      <div id={`optionField?${item.id}`} className='mr-[2rem] text-sm text-left flex-1 w-[5rem]'>
                        位於 {item.field}
                      </div>
                    </div>
                  );
              })}
            </>
          ) : (
            <></>
          )}
        </div>

        {/* Browsing Toggle */}
        <div className={`w-[25rem] px-5 pt-[1rem] pb-[1rem] mt-[1rem] text-base rounded-lg bg-white ${searched ? 'hidden' : 'block'}`}>
          <div className='flex'>
            <div className='flex-auto w-[20rem] font-bold'>Browsing Mode</div>
            <label className='flex-auto w-[5rem] ml-[0.5rem] pl-[1rem]'>
              <input className='mr-1 cursor-pointer' type='checkbox' checked={isBrowsing} onChange={handleBrowsingOptionClick} />
              On
            </label>
          </div>
        </div>

        {/* Star of the Day */}
        <div
          className={`w-[25rem] h-[8rem] px-5 pt-[1rem] pb-[1rem] mt-[1rem] text-base rounded-lg bg-white ${searched || isBrowsing ? 'hidden' : 'block'
            }`}
        >
          <div className='flex'>
            <div className='flex-auto w-[15rem] font-bold'>Star of the Day</div>
            <div className='flex-auto w-[5rem] mr-[0.5rem] pl-[1rem] text-right'>
              {month}月{date}日
            </div>
          </div>
          <div className='flex text-sm'>
            <div className='w-[17.5rem] mt-[1rem] ml-[0.5rem] text-slate-600'>{starOption[today_id].display_name}</div>
            <div
              className='mt-[0.8rem] ml-[0.5rem] px-[1rem] py-[0.3rem] bg-slate-300 rounded-lg hover:cursor-pointer hover:bg-slate-200'
              id={starOption[today_id].id}
              onClick={handleDailyStarClick}
            >
              查看
            </div>
          </div>
          <div className='w-[20rem] mt-[0.5rem] ml-[0.5rem] text-sm text-slate-600'>位於 {starOption[today_id].field}</div>
        </div>

      </div>

      {/* Display Area: Star */}
      <div className={`absolute top-[4rem] left-4 w-[26rem] h-[90vh] overflow-y-scroll ${searched && isStar ? 'block' : 'hidden'} max-md:hidden`}>
        <div className='px-5 mt-6'>
          <div className='flex'>
            <div className='text-2xl mb-2'>{starMetaData.display_name}</div>
            <div className='w-[3rem] h-[1.5rem] mt-[0.3rem] ml-[1rem] py-[0.1rem] pl-1 pr-1 bg-slate-900 rounded-lg text-sm text-center text-slate-100'>
              星名
            </div>
          </div>
          <div className='mb-3 text-base flex'>位於 {starMetaData.const_name}</div>
          <div className='flex'>
            <div className='mb-1 text-base flex flex-auto'>
              <div className='w-[3rem] py-[0.25rem] px-2 bg-slate-200 rounded-lg text-sm/[1.5rem] text-center'>別名</div>
              <div className='py-1 px-2'>{starMetaData.prop_name}</div>
            </div>
            <div className='mb-1 text-base flex flex-auto'>
              <div className='w-[3rem] py-[0.25rem] px-2 bg-slate-200 rounded-lg text-sm/[1.5rem] text-center'>顏色</div>
              <div className='py-1 px-2'>{starMetaData.color}</div>
            </div>
          </div>
          <div className='mb-1 text-base flex flex-auto'>
            <div className='w-[3rem] py-[0.25rem] px-2 bg-slate-200 rounded-lg text-sm/[1.5rem] text-center'>RA</div>
            <div className='py-1 px-2'>{starMetaData.ra}</div>
          </div>
          <div className='mb-1 text-base flex flex-auto'>
            <div className='w-[3rem] py-[0.25rem] px-2 bg-slate-200 rounded-lg text-sm/[1.5rem] text-center'>DEC</div>
            <div className='py-1 px-2'>{starMetaData.dec}</div>
          </div>
        </div>
        <div className='h-[37rem] px-5 mt-5'>
          <div className='mb-5 p-3 bg-neutral-200 rounded-lg text-base leading-7'>
            <div className='mb-2 text-lg font-bold'>步天歌</div>
            <div className='font-serif'>{parse(paragraphs?.text)}</div>
          </div>
          <div className='text-base leading-7'>
            {mainParagraphs.map((p, i) => {
              return (
                <div key={i}>
                  <div className='mb-1 text-lg font-bold'>{p.type}</div>
                  <div className='mb-3'>{parse(p.text)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Display Area: Constellation */}
      <div className={`absolute top-[4rem] left-4 w-[26rem] h-[90vh] overflow-y-scroll ${searched && !isStar ? 'block' : 'hidden'} max-md:hidden`}>
        <div className='px-5 mt-6 flex'>
          <div className='text-2xl'>{constMetaData.display_name}</div>
          <div className='w-[3rem] h-[1.5rem] mt-[0.3rem] ml-[1rem] py-[0.1rem] pl-1 pr-1 bg-slate-600 rounded-lg text-sm text-center text-slate-100'>
            星官
          </div>
        </div>
        <div className='h-[37rem] px-5 mt-5'>
          <div className='mb-5 p-3 bg-neutral-200 rounded-lg text-base leading-7'>
            <div className='mb-2 text-lg font-bold'>步天歌</div>
            <div className='font-serif'>{parse(paragraphs?.text)}</div>
          </div>
          <div className='text-base leading-7'>
            {mainParagraphs.map((p, i) => {
              return (
                <div key={i}>
                  <div className='mb-1 text-lg font-bold'>{p.type}</div>
                  <div className='mb-3'>{parse(p.text)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skymap;
